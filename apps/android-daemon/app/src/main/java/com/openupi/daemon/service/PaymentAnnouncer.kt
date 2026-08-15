package com.openupi.daemon.service

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import java.util.Locale

private const val TAG = "OpenUPI.TTS"

/**
 * Announces incoming UPI payments via the device speaker.
 * Replicates the Paytm/PhonePe soundbox experience without extra hardware.
 */
class PaymentAnnouncer private constructor(context: Context) {
    private var tts: TextToSpeech? = null

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = tts?.setLanguage(Locale("en", "IN"))
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts?.language = Locale.ENGLISH
                }
                Log.i(TAG, "TTS initialized successfully")
            } else {
                Log.w(TAG, "TTS initialization failed with status: $status")
            }
        }
    }

    fun announce(amount: Double) {
        val rupees = amount.toInt()
        val paise = Math.round((amount - rupees) * 100).toInt()
        val text = if (paise > 0) {
            "Received $rupees Rupees and $paise Paise on U P I."
        } else {
            "Received $rupees Rupees on U P I."
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "OPENUPI_TTS_${System.currentTimeMillis()}")
    }

    fun shutdown() = tts?.shutdown()

    companion object {
        @Volatile private var instance: PaymentAnnouncer? = null
        fun get(context: Context): PaymentAnnouncer =
            instance ?: synchronized(this) {
                instance ?: PaymentAnnouncer(context).also { instance = it }
            }
    }
}
