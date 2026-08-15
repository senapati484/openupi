# Keep Data DTOs for Room and Network
-keep class com.openupi.daemon.data.** { *; }
-keep class com.openupi.daemon.parser.** { *; }
-keep class com.openupi.daemon.network.** { *; }

# WorkManager
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }
