package com.openupi.daemon.service

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.openupi.daemon.data.AppDatabase
import com.openupi.daemon.data.QueuedPayment
import com.openupi.daemon.parser.ParserRegistry
import com.openupi.daemon.ui.LiveLogBus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val TAG = "OpenUPI.NotifListener"

class PaymentNotificationListener : NotificationListenerService() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val pkg = sbn.packageName

        scope.launch {
            for (parser in ParserRegistry.parsers) {
                if (!parser.canHandle(pkg, title, text)) continue
                val payment = parser.extract(title, text) ?: continue

                val logMsg = "[INTERCEPT] ₹${payment.amount} | UTR: ${payment.utr ?: "N/A"} | from $pkg"
                Log.i(TAG, logMsg)
                LiveLogBus.emit(logMsg)

                // Persist to local Room DB before attempting network dispatch
                AppDatabase.get(applicationContext).paymentDao().insert(
                    QueuedPayment(
                        amount = payment.amount,
                        utr = payment.utr,
                        rawText = payment.rawText,
                        timestamp = payment.timestamp
                    )
                )

                // Announce via TTS soundbox
                PaymentAnnouncer.get(applicationContext).announce(payment.amount)

                // Trigger offline-aware sync worker
                PaymentSyncWorker.enqueue(applicationContext)
                break
            }
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "Notification listener connected")
        LiveLogBus.emit("[SYSTEM] Notification listener active ✓")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "Notification listener disconnected — requesting rebind")
        requestRebind(ComponentName(this, PaymentNotificationListener::class.java))
    }
}
