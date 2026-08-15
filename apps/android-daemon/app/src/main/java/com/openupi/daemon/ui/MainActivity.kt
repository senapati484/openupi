package com.openupi.daemon.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.openupi.daemon.network.NetworkClient
import com.openupi.daemon.service.HeartbeatWorker
import com.openupi.daemon.service.KeepAliveService
import com.openupi.daemon.service.PaymentAnnouncer
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

val Context.dataStore by preferencesDataStore(name = "openupi_settings")

// Preference Keys
val KEY_SERVER_URL = stringPreferencesKey("server_url")
val KEY_SECRET_KEY = stringPreferencesKey("secret_key")
val KEY_FALLBACK_URL = stringPreferencesKey("fallback_webhook_url")
val KEY_MONGO_URI = stringPreferencesKey("mongo_uri")
val KEY_MERCHANT_VPA = stringPreferencesKey("merchant_vpa")
val KEY_MERCHANT_NAME = stringPreferencesKey("merchant_name")
val KEY_BANK_KEYWORDS = stringPreferencesKey("bank_keywords")
val KEY_ENABLE_TTS = booleanPreferencesKey("enable_tts")

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Start background services
        startForegroundService(Intent(this, KeepAliveService::class.java))
        HeartbeatWorker.schedulePeriodicHeartbeat(this)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                OpenUPIMainScreen()
            }
        }
    }
}

@Composable
fun OpenUPIMainScreen() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Console", "Credentials & Links", "Bank & Audio", "Diagnostics")

    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        // ── Top App Bar ───────────────────────────────────────────────────────
        Surface(
            color = Color(0xFF1E293B),
            shadowElevation = 4.dp
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("⚡ OpenUPI", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = Color(0xFF0284C7).copy(alpha = 0.2f)
                        ) {
                            Text("Daemon v1.0.0", fontSize = 11.sp, color = Color(0xFF38BDF8), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    Text("Zero-Fee Gateway", fontSize = 12.sp, color = Color(0xFF94A3B8))
                }

                Spacer(Modifier.height(12.dp))

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color(0xFF1E293B),
                    contentColor = Color(0xFF38BDF8),
                    divider = {}
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = { Text(title, fontSize = 12.sp, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) }
                        )
                    }
                }
            }
        }

        // ── Tab Content ───────────────────────────────────────────────────────
        Box(Modifier.fillMaxSize().padding(16.dp)) {
            when (selectedTab) {
                0 -> ConsoleTab()
                1 -> CredentialsAndLinksTab()
                2 -> BankAndAudioTab()
                3 -> DiagnosticsTab()
            }
        }
    }
}

// ── Tab 1: Live Intercept Console ─────────────────────────────────────────────
@Composable
fun ConsoleTab() {
    val context = LocalContext.current
    val logEntries = remember { mutableStateListOf<String>() }
    val listState = rememberLazyListState()

    var hasSmsPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED)
    }
    val isNotifListenerActive = isNotificationListenerEnabled(context)

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasSmsPermission = permissions[Manifest.permission.RECEIVE_SMS] == true
    }

    LaunchedEffect(Unit) {
        LiveLogBus.events.collect { entry ->
            logEntries.add(0, entry)
            if (logEntries.size > 250) logEntries.removeAt(logEntries.lastIndex)
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Status Alerts
        if (!isNotifListenerActive || !hasSmsPermission) {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Column(Modifier.padding(12.dp)) {
                    Text("⚠️ Required Permissions Missing", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Spacer(Modifier.height(4.dp))
                    if (!isNotifListenerActive) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("• Notification Listener disabled", color = Color(0xFFFCA5A5), fontSize = 12.sp, modifier = Modifier.weight(1f))
                            TextButton(onClick = { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }) {
                                Text("Enable", color = Color(0xFFFBBF24), fontSize = 12.sp)
                            }
                        }
                    }
                    if (!hasSmsPermission) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("• SMS Permission disabled", color = Color(0xFFFCA5A5), fontSize = 12.sp, modifier = Modifier.weight(1f))
                            TextButton(onClick = { permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)) }) {
                                Text("Grant", color = Color(0xFFFBBF24), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Real-Time Payment Intercept Stream", color = Color(0xFF94A3B8), fontSize = 12.sp)
            TextButton(onClick = { logEntries.clear() }) { Text("Clear", color = Color(0xFF64748B), fontSize = 12.sp) }
        }

        SelectionContainer {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color(0xFF1E293B), shape = MaterialTheme.shapes.medium)
                    .padding(8.dp)
            ) {
                if (logEntries.isEmpty()) {
                    item {
                        Text(
                            "Waiting for bank SMS / UPI app transactions...\nMake a test payment or use 'Simulate Test' in Diagnostics.",
                            color = Color(0xFF64748B),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
                items(logEntries) { entry ->
                    Text(
                        text = entry,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = when {
                            entry.contains("INTERCEPT") || entry.contains("delivered") -> Color(0xFF34D399)
                            entry.contains("FAILED") || entry.contains("ERROR") -> Color(0xFFF87171)
                            entry.contains("HEARTBEAT") -> Color(0xFF60A5FA)
                            else -> Color(0xFFCBD5E1)
                        }
                    )
                }
            }
        }
    }
}

// ── Tab 2: All Credentials & Connection Links ─────────────────────────────────
@Composable
fun CredentialsAndLinksTab() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var serverUrl by remember { mutableStateOf("") }
    var secretKey by remember { mutableStateOf("") }
    var fallbackUrl by remember { mutableStateOf("") }
    var mongoUri by remember { mutableStateOf("") }
    var merchantVpa by remember { mutableStateOf("") }
    var merchantName by remember { mutableStateOf("") }
    var saveStatus by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        context.dataStore.data.collectLatest { prefs ->
            serverUrl = prefs[KEY_SERVER_URL] ?: ""
            secretKey = prefs[KEY_SECRET_KEY] ?: ""
            fallbackUrl = prefs[KEY_FALLBACK_URL] ?: ""
            mongoUri = prefs[KEY_MONGO_URI] ?: ""
            merchantVpa = prefs[KEY_MERCHANT_VPA] ?: ""
            merchantName = prefs[KEY_MERCHANT_NAME] ?: ""
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(scrollState)) {
        Text("Gateway & Connection Links", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
        Text("Store your self-hosted backend credentials and direct database references directly inside the daemon.", fontSize = 12.sp, color = Color(0xFF64748B))

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("Gateway Server URL") },
            placeholder = { Text("https://pay.yourdomain.com") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(10.dp))

        OutlinedTextField(
            value = secretKey,
            onValueChange = { secretKey = it },
            label = { Text("Device Shared Secret (HMAC-SHA256)") },
            placeholder = { Text("32-byte secret key from .env") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(10.dp))

        OutlinedTextField(
            value = fallbackUrl,
            onValueChange = { fallbackUrl = it },
            label = { Text("Fallback Direct Ingest / Webhook Link") },
            placeholder = { Text("https://backup.yourdomain.com/api/v1/internal/ingest") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(10.dp))

        OutlinedTextField(
            value = mongoUri,
            onValueChange = { mongoUri = it },
            label = { Text("MongoDB Connection String Reference") },
            placeholder = { Text("mongodb+srv://user:pass@cluster.mongodb.net/openupi") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(10.dp))

        OutlinedTextField(
            value = merchantVpa,
            onValueChange = { merchantVpa = it },
            label = { Text("Merchant VPA / UPI ID") },
            placeholder = { Text("yourbusiness@okaxis") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )
        Spacer(Modifier.height(10.dp))

        OutlinedTextField(
            value = merchantName,
            onValueChange = { merchantName = it },
            label = { Text("Merchant Business Name") },
            placeholder = { Text("Acme Corp") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            singleLine = true
        )

        Spacer(Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = {
                    scope.launch {
                        context.dataStore.edit { prefs ->
                            prefs[KEY_SERVER_URL] = serverUrl.trim()
                            prefs[KEY_SECRET_KEY] = secretKey.trim()
                            prefs[KEY_FALLBACK_URL] = fallbackUrl.trim()
                            prefs[KEY_MONGO_URI] = mongoUri.trim()
                            prefs[KEY_MERCHANT_VPA] = merchantVpa.trim()
                            prefs[KEY_MERCHANT_NAME] = merchantName.trim()
                        }
                        saveStatus = "All credentials saved securely ✓"
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
            ) { Text("Save Credentials") }

            Spacer(Modifier.width(12.dp))
            if (saveStatus.isNotEmpty()) {
                Text(saveStatus, color = Color(0xFF34D399), fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

// ── Tab 3: Bank Keywords & Audio Settings ─────────────────────────────────────
@Composable
fun BankAndAudioTab() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var bankKeywords by remember { mutableStateOf("UCOBNK,SBINB,SBINR,HDFCBK,ICICIB,AXISBK,KOTAKB,UNIONB,YESBNK,IDBIBK,PUNBNK,BOIIND,CANBNK") }
    var enableTts by remember { mutableStateOf(true) }
    var saveMsg by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        context.dataStore.data.collectLatest { prefs ->
            bankKeywords = prefs[KEY_BANK_KEYWORDS] ?: "UCOBNK,SBINB,SBINR,HDFCBK,ICICIB,AXISBK,KOTAKB,UNIONB,YESBNK,IDBIBK,PUNBNK,BOIIND,CANBNK"
            enableTts = prefs[KEY_ENABLE_TTS] ?: true
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(scrollState)) {
        Text("Bank Filters & Soundbox TTS", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
        Text("Configure which bank SMS sender IDs are intercepted and toggle soundbox audio alerts.", fontSize = 12.sp, color = Color(0xFF64748B))

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = bankKeywords,
            onValueChange = { bankKeywords = it },
            label = { Text("Bank SMS Sender IDs (Comma-separated)") },
            modifier = Modifier.fillMaxWidth(),
            colors = outlinedTextFieldColors(),
            minLines = 3
        )
        Text("Matches standard TRAI DLT banking sender headers like VM-UCOBNK-S, BW-HDFCBK, VK-SBINB.", fontSize = 11.sp, color = Color(0xFF64748B))

        Spacer(Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Soundbox Audio Alerts (TTS)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Speaks 'Received ₹499 on UPI' via phone speaker upon payment confirmation.", color = Color(0xFF94A3B8), fontSize = 12.sp)
                }
                Switch(
                    checked = enableTts,
                    onCheckedChange = { enableTts = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF38BDF8), checkedTrackColor = Color(0xFF0284C7))
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = {
                    scope.launch {
                        context.dataStore.edit { prefs ->
                            prefs[KEY_BANK_KEYWORDS] = bankKeywords.trim()
                            prefs[KEY_ENABLE_TTS] = enableTts
                        }
                        saveMsg = "Bank & Audio settings saved ✓"
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
            ) { Text("Save Settings") }

            Spacer(Modifier.width(12.dp))
            OutlinedButton(
                onClick = { PaymentAnnouncer.get(context).announce(499.05) }
            ) { Text("Test Soundbox", color = Color(0xFF38BDF8)) }

            Spacer(Modifier.width(8.dp))
            if (saveMsg.isNotEmpty()) {
                Text(saveMsg, color = Color(0xFF34D399), fontSize = 13.sp)
            }
        }
    }
}

// ── Tab 4: Connection Diagnostics & Liveness ──────────────────────────────────
@Composable
fun DiagnosticsTab() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var pingStatus by remember { mutableStateOf<String?>(null) }
    var isPinging by remember { mutableStateOf(false) }

    val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    val isCharging = bm.isCharging

    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    val isIgnoringBattery = powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true
    val isNotifListenerActive = isNotificationListenerEnabled(context)

    Column(Modifier.fillMaxSize()) {
        Text("System Diagnostics & Health", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
        Spacer(Modifier.height(12.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
            Column(Modifier.padding(14.dp)) {
                Text("Device Telemetry", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Spacer(Modifier.height(6.dp))
                Text("🔋 Battery Level: $batteryLevel% ${if (isCharging) "⚡ Charging" else ""}", color = Color(0xFFCBD5E1), fontSize = 13.sp)
                Text("🛡️ Battery Optimization Exempt: ${if (isIgnoringBattery) "YES (Optimal 24/7)" else "NO (May be killed)"}", color = if (isIgnoringBattery) Color(0xFF34D399) else Color(0xFFF87171), fontSize = 13.sp)
                Text("🔔 Notification Listener: ${if (isNotifListenerActive) "CONNECTED ✓" else "DISCONNECTED ✗"}", color = if (isNotifListenerActive) Color(0xFF34D399) else Color(0xFFF87171), fontSize = 13.sp)
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
            Column(Modifier.padding(14.dp)) {
                Text("Gateway Server Connectivity Test", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Button(
                        onClick = {
                            isPinging = true
                            scope.launch {
                                val prefs = context.dataStore.data.collectLatest { p ->
                                    val serverUrl = p[KEY_SERVER_URL] ?: ""
                                    val secret = p[KEY_SECRET_KEY] ?: ""
                                    val ok = NetworkClient.postHeartbeat(serverUrl, secret, batteryLevel, isCharging)
                                    pingStatus = if (ok) "Gateway responded: 200 OK (Healthy ✓)" else "Gateway connection failed ✗"
                                    isPinging = false
                                }
                            }
                        },
                        enabled = !isPinging,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                    ) { Text(if (isPinging) "Pinging..." else "Ping Server") }

                    Spacer(Modifier.width(12.dp))
                    OutlinedButton(
                        onClick = {
                            LiveLogBus.emit("[TEST] Simulated manual bank credit ₹250.04 (SBI)")
                        }
                    ) { Text("Simulate Payment", color = Color(0xFF38BDF8)) }
                }

                if (pingStatus != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(pingStatus!, color = if (pingStatus!!.contains("OK")) Color(0xFF34D399) else Color(0xFFF87171), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
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
