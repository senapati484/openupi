package com.openupi.daemon.network

import android.util.Log
import androidx.datastore.preferences.core.stringPreferencesKey
import com.openupi.daemon.parser.ParsedPayment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

private const val TAG = "OpenUPI.NetworkClient"

object NetworkClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    /**
     * Dispatches a parsed payment to the OpenUPI backend /ingest endpoint.
     * Signs the payload with HMAC-SHA256 using the stored device secret.
     *
     * @return true if server acknowledged successfully (HTTP 2xx)
     */
    suspend fun postPayment(
        payment: ParsedPayment,
        serverUrl: String,
        deviceSecret: String
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().apply {
                put("amount", payment.amount)
                put("utr", payment.utr ?: "")
                put("sender", payment.sender)
                put("rawText", payment.rawText)
                put("timestamp", payment.timestamp)
            }.toString()

            val timestamp = System.currentTimeMillis().toString()
            val signature = hmacSha256("$payload.$timestamp", deviceSecret)

            val request = Request.Builder()
                .url("$serverUrl/api/v1/internal/ingest")
                .header("Content-Type", "application/json")
                .header("X-OpenUPI-Timestamp", timestamp)
                .header("X-OpenUPI-Signature", signature)
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()

            val response = client.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            Log.i(TAG, "Ingest response: ${response.code} | amount=₹${payment.amount}")
            success
        } catch (e: Exception) {
            Log.e(TAG, "Network dispatch failed: ${e.message}", e)
            false
        }
    }

    /**
     * Sends a heartbeat ping to the backend.
     */
    suspend fun postHeartbeat(
        serverUrl: String,
        deviceSecret: String,
        batteryLevel: Int,
        isCharging: Boolean
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().apply {
                put("batteryLevel", batteryLevel)
                put("isCharging", isCharging)
                put("version", "1.0.0")
                put("timestamp", System.currentTimeMillis())
            }.toString()

            val timestamp = System.currentTimeMillis().toString()
            val signature = hmacSha256("$payload.$timestamp", deviceSecret)

            val request = Request.Builder()
                .url("$serverUrl/api/v1/internal/heartbeat")
                .header("Content-Type", "application/json")
                .header("X-OpenUPI-Timestamp", timestamp)
                .header("X-OpenUPI-Signature", signature)
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { it.isSuccessful }
        } catch (e: Exception) {
            Log.w(TAG, "Heartbeat failed: ${e.message}")
            false
        }
    }

    private fun hmacSha256(data: String, key: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(data.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}
