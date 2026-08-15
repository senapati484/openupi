package com.openupi.daemon.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.openupi.daemon.service.HeartbeatWorker
import com.openupi.daemon.service.KeepAliveService

/**
 * Restarts the OpenUPI daemon services after device reboot.
 * Registered in AndroidManifest for BOOT_COMPLETED and QUICKBOOT_POWERON.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            Log.i("OpenUPI.BootReceiver", "Device booted — starting daemon services")

            // Restart foreground keep-alive service
            val keepAlive = Intent(context, KeepAliveService::class.java)
            context.startForegroundService(keepAlive)

            // Re-schedule periodic heartbeat
            HeartbeatWorker.schedulePeriodicHeartbeat(context)
        }
    }
}
