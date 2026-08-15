package com.openupi.daemon.service

import android.content.Context
import android.os.BatteryManager
import androidx.work.*
import com.openupi.daemon.data.AppSettings
import com.openupi.daemon.data.dataStore
import com.openupi.daemon.network.NetworkClient
import com.openupi.daemon.ui.LiveLogBus
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

private const val HEARTBEAT_WORK_NAME = "HeartbeatWorker"

class HeartbeatWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.dataStore.data.first()
        val serverUrl = prefs[AppSettings.KEY_SERVER_URL] ?: return Result.failure()
        val deviceSecret = prefs[AppSettings.KEY_SECRET_KEY] ?: return Result.failure()

        val bm = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val isCharging = bm.isCharging

        val success = NetworkClient.postHeartbeat(serverUrl, deviceSecret, batteryLevel, isCharging)
        LiveLogBus.emit("[HEARTBEAT] Battery: $batteryLevel% | Charging: $isCharging | ${if (success) "OK ✓" else "FAILED ✗"}")

        return if (success) Result.success() else Result.retry()
    }

    companion object {
        fun schedulePeriodicHeartbeat(context: Context) {
            val request = PeriodicWorkRequestBuilder<HeartbeatWorker>(1, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.LINEAR, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                HEARTBEAT_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
