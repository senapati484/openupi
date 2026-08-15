package com.openupi.daemon.service

import android.content.Context
import android.os.BatteryManager
import android.util.Log
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.work.*
import com.openupi.daemon.data.AppDatabase
import com.openupi.daemon.data.QueuedPayment
import com.openupi.daemon.network.NetworkClient
import com.openupi.daemon.ui.LiveLogBus
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

private const val TAG = "OpenUPI.SyncWorker"
private const val WORK_NAME = "PaymentSyncWorker"

class PaymentSyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.dataStore.data.first()
        val serverUrl = prefs[stringPreferencesKey("server_url")] ?: return Result.failure()
        val deviceSecret = prefs[stringPreferencesKey("secret_key")] ?: return Result.failure()

        val dao = AppDatabase.get(applicationContext).paymentDao()
        val pending = dao.getAllPending()

        if (pending.isEmpty()) return Result.success()

        var hadFailure = false
        for (item in pending) {
            val success = NetworkClient.postPayment(
                com.openupi.daemon.parser.ParsedPayment(
                    amount = item.amount,
                    utr = item.utr,
                    sender = "daemon-offline-queue",
                    rawText = item.rawText,
                    timestamp = item.timestamp
                ),
                serverUrl,
                deviceSecret
            )
            if (success) {
                dao.delete(item.id)
                LiveLogBus.emit("[SYNC] ₹${item.amount} delivered ✓")
                Log.i(TAG, "Delivered queued payment: ₹${item.amount}")
            } else {
                dao.incrementAttempts(item.id)
                if (item.attempts >= 5) {
                    Log.e(TAG, "Payment ₹${item.amount} exhausted retries — dropping")
                    dao.delete(item.id)
                }
                hadFailure = true
            }
        }

        return if (hadFailure) Result.retry() else Result.success()
    }

    companion object {
        /**
         * Enqueues a one-time expedited sync, with backoff on retry.
         * Safe to call multiple times — WorkManager deduplicates.
         */
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<PaymentSyncWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }
    }
}
