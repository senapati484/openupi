package com.openupi.daemon.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.openupi.daemon.service.HeartbeatWorker
import com.openupi.daemon.service.KeepAliveService
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

val Context.dataStore by preferencesDataStore(name = "openupi_settings")

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Start foreground service
        startForegroundService(Intent(this, KeepAliveService::class.java))
        HeartbeatWorker.schedulePeriodicHeartbeat(this)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                OpenUPIScreen()
            }
        }
    }
}

@Composable
fun OpenUPIScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val logEntries = remember { mutableStateListOf<String>() }
    val listState = rememberLazyListState()
    var serverUrl by remember { mutableStateOf("") }
    var secretKey by remember { mutableStateOf("") }
    var saveStatus by remember { mutableStateOf("") }

    var hasSmsPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        )
    }

    var hasNotificationPermission by remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else true
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasSmsPermission = permissions[Manifest.permission.RECEIVE_SMS] == true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotificationPermission = permissions[Manifest.permission.POST_NOTIFICATIONS] == true
        }
    }

    // Load saved prefs
    LaunchedEffect(Unit) {
        context.dataStore.data.collectLatest { prefs ->
            serverUrl = prefs[stringPreferencesKey("server_url")] ?: ""
            secretKey = prefs[stringPreferencesKey("secret_key")] ?: ""
        }
    }

    // Stream live log events
    LaunchedEffect(Unit) {
        LiveLogBus.events.collect { entry ->
            logEntries.add(0, entry)
            if (logEntries.size > 200) logEntries.removeAt(logEntries.lastIndex)
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        // ── Header ────────────────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("OpenUPI Daemon", fontSize = 22.sp, color = Color(0xFF38BDF8), fontFamily = FontFamily.Monospace)
            Text("v1.0.0", fontSize = 12.sp, color = Color(0xFF64748B))
        }
        Spacer(Modifier.height(8.dp))

        // ── Permission Banners ───────────────────────────────────────────────
        val isNotifListenerActive = isNotificationListenerEnabled(context)

        if (!isNotifListenerActive) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
            ) {
                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("⚠️ Notification Access needed", color = Color.White, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    }) { Text("Enable", color = Color(0xFFFBBF24)) }
                }
            }
        }

        if (!hasSmsPermission) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF854D0E)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
            ) {
                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("📩 SMS Permission needed for Bank SMS", color = Color.White, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        val perms = mutableListOf(
                            Manifest.permission.RECEIVE_SMS,
                            Manifest.permission.READ_SMS
                        )
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            perms.add(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        permissionLauncher.launch(perms.toTypedArray())
                    }) { Text("Grant", color = Color(0xFFFDE047)) }
                }
            }
        }

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isIgnoringBattery = powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true
        if (!isIgnoringBattery) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("🔋 Disable Battery Optimization (24/7 background)", color = Color(0xFFCBD5E1), fontSize = 12.sp, modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                        context.startActivity(intent)
                    }) { Text("Allow", color = Color(0xFF38BDF8)) }
                }
            }
        }

        // ── Config Fields ────────────────────────────────────────────────────
        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("Server URL", color = Color(0xFF94A3B8)) },
            placeholder = { Text("https://pay.yourdomain.com") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = secretKey,
            onValueChange = { secretKey = it },
            label = { Text("Device Shared Secret", color = Color(0xFF94A3B8)) },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = {
                    scope.launch {
                        context.dataStore.edit { prefs ->
                            prefs[stringPreferencesKey("server_url")] = serverUrl.trim()
                            prefs[stringPreferencesKey("secret_key")] = secretKey.trim()
                        }
                        saveStatus = "Saved ✓"
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
            ) { Text("Save Config") }

            Spacer(Modifier.width(12.dp))
            OutlinedButton(
                onClick = {
                    LiveLogBus.emit("[TEST] Simulated manual bank credit test ₹100.05")
                }
            ) { Text("Simulate Test", color = Color(0xFF94A3B8)) }

            Spacer(Modifier.width(8.dp))
            if (saveStatus.isNotEmpty()) {
                Text(saveStatus, color = Color(0xFF34D399), fontSize = 13.sp)
            }
        }

        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = Color(0xFF1E293B))
        Spacer(Modifier.height(6.dp))

        // ── Live Log Console ─────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Live Intercept Stream", color = Color(0xFF64748B), fontSize = 12.sp)
            Text("${logEntries.size} events", color = Color(0xFF64748B), fontSize = 12.sp)
        }
        Spacer(Modifier.height(4.dp))
        SelectionContainer {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color(0xFF1E293B), shape = MaterialTheme.shapes.medium)
                    .padding(8.dp),
                reverseLayout = false
            ) {
                if (logEntries.isEmpty()) {
                    item {
                        Text(
                            "Waiting for bank SMS / UPI app notifications...",
                            color = Color(0xFF64748B),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
                items(logEntries) { entry ->
                    Text(
                        text = entry,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (entry.contains("INTERCEPT")) Color(0xFF34D399)
                                else if (entry.contains("FAILED") || entry.contains("ERROR")) Color(0xFFF87171)
                                else Color(0xFFCBD5E1)
                    )
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF38BDF8),
    unfocusedBorderColor = Color(0xFF334155),
    cursorColor = Color(0xFF38BDF8),
    focusedTextColor = Color.White,
    unfocusedTextColor = Color(0xFFCBD5E1),
)

private fun isNotificationListenerEnabled(context: Context): Boolean {
    val packageName = context.packageName
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    return flat?.contains(packageName) == true
}
