package com.openupi.daemon.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.openupi.daemon.data.AppDatabase
import com.openupi.daemon.data.QueuedPayment
import com.openupi.daemon.parser.GenericSmsBankParser
import com.openupi.daemon.service.PaymentAnnouncer
import com.openupi.daemon.service.PaymentSyncWorker
import com.openupi.daemon.ui.LiveLogBus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val TAG = "OpenUPI.SmsReceiver"

/**
 * Direct SMS Broadcast Receiver for native bank SMS credit alerts.
 * Captures SMS alerts directly from the telephony layer for maximum reliability,
 * especially on devices where notification listeners may lag or be silenced.
 */
class SmsReceiver : BroadcastReceiver() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val smsParser = GenericSmsBankParser()

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Group messages by originating address (sender)
        val sender = messages[0].displayOriginatingAddress ?: ""
        val bodyBuilder = StringBuilder()
        for (sms in messages) {
            bodyBuilder.append(sms.displayMessageBody)
        }
        val fullBody = bodyBuilder.toString()

        Log.d(TAG, "SMS Received from: $sender | Length: ${fullBody.length}")

        scope.launch {
            if (smsParser.canHandle("com.android.mms", sender, fullBody)) {
                val payment = smsParser.extract(sender, fullBody)
                if (payment != null) {
                    val logMsg = "[SMS INTERCEPT] ₹${payment.amount} | UTR: ${payment.utr ?: "N/A"} | Sender: $sender"
                    Log.i(TAG, logMsg)
                    LiveLogBus.emit(logMsg)

                    // 1. Store in offline Room DB queue
                    AppDatabase.get(context.applicationContext).paymentDao().insert(
                        QueuedPayment(
                            amount = payment.amount,
                            utr = payment.utr,
                            rawText = payment.rawText,
                            timestamp = payment.timestamp
                        )
                    )

                    // 2. Announce audio alert
                    PaymentAnnouncer.get(context.applicationContext).announce(payment.amount)

                    // 3. Dispatch to backend via WorkManager
                    PaymentSyncWorker.enqueue(context.applicationContext)
                } else {
                    Log.d(TAG, "SMS from allowlisted bank but not a credit transaction: $sender")
                }
            }
        }
    }
}
