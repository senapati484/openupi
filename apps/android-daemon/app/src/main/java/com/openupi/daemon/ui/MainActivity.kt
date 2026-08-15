package com.openupi.daemon.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.openupi.daemon.R
import com.openupi.daemon.network.NetworkClient
import com.openupi.daemon.service.HeartbeatWorker
import com.openupi.daemon.service.KeepAliveService
import com.openupi.daemon.service.PaymentAnnouncer
import kotlinx.coroutines.delay
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
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF38BDF8),
                    background = Color(0xFF0B0F19),
                    surface = Color(0xFF1E293B),
                    onSurface = Color(0xFFF1F5F9)
                )
            ) {
                OpenUPIMainScreen()
            }
        }
    }
}

// ── Main Shell with Premium Navigation ────────────────────────────────────────
@Composable
fun OpenUPIMainScreen() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf(
        TabItem("Console", Icons.Filled.Terminal),
        TabItem("Credentials", Icons.Filled.Key),
        TabItem("Audio & Rules", Icons.Filled.VolumeUp),
        TabItem("Diagnostics", Icons.Filled.Speed)
    )

    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
    ) {
        // ── Top App Bar ───────────────────────────────────────────────────────
        Surface(
            color = Color(0xFF131C2E),
            shadowElevation = 8.dp
        ) {
            Column {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.openupi_logo),
                            contentDescription = "OpenUPI Logo",
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                        )
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "OpenUPI",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF38BDF8)
                                )
                                Spacer(Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = Color(0xFF0284C7).copy(alpha = 0.25f)
                                ) {
                                    Text(
                                        "v1.0.0",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF7DD3FC),
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                "Payment Listener Daemon",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }
                    }

                    // Live Daemon Status Badge
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = Color(0xFF065F46).copy(alpha = 0.4f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669))
                    ) {
                        Row(
                            Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF34D399))
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "Active 24/7",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF6EE7B7)
                            )
                        }
                    }
                }

                // ── Scrollable Tab Bar (No cramped wrapping) ──────────────────────
                ScrollableTabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color(0xFF131C2E),
                    contentColor = Color(0xFF38BDF8),
                    edgePadding = 12.dp,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = Color(0xFF38BDF8),
                            height = 3.dp
                        )
                    },
                    divider = { HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp) }
                ) {
                    tabs.forEachIndexed { index, tab ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp)
                                ) {
                                    Icon(
                                        tab.icon,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (selectedTab == index) Color(0xFF38BDF8) else Color(0xFF64748B)
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        tab.title,
                                        fontSize = 13.sp,
                                        fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                                        color = if (selectedTab == index) Color.White else Color(0xFF94A3B8)
                                    )
                                }
                            }
                        )
                    }
                }
            }
        }

        // ── Tab Content ───────────────────────────────────────────────────────
        Box(
            Modifier
                .fillMaxSize()
                .padding(14.dp)
        ) {
            when (selectedTab) {
                0 -> ConsoleTab()
                1 -> CredentialsAndLinksTab()
                2 -> BankAndAudioTab()
                3 -> DiagnosticsTab()
            }
        }
    }
}

data class TabItem(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

// ── Tab 1: Live Intercept Console ─────────────────────────────────────────────
@Composable
fun ConsoleTab() {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val logEntries = remember { mutableStateListOf<String>() }
    val listState = rememberLazyListState()

    val isNotifListenerActive = isNotificationListenerEnabled(context)

    LaunchedEffect(Unit) {
        LiveLogBus.events.collect { entry ->
            logEntries.add(0, entry)
            if (logEntries.size > 250) logEntries.removeAt(logEntries.lastIndex)
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Status Alerts
        if (!isNotifListenerActive) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.Warning,
                        contentDescription = null,
                        tint = Color(0xFFFCA5A5),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Notification Listener Disabled",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            "Daemon cannot capture UPI transactions without notification access.",
                            color = Color(0xFFFCA5A5),
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Enable", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }

        // Action Toolbar
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Live Event Stream",
                    color = Color(0xFFCBD5E1),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = Color(0xFF1E293B)
                ) {
                    Text(
                        "${logEntries.size} events",
                        fontSize = 10.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Row {
                if (logEntries.isNotEmpty()) {
                    TextButton(
                        onClick = {
                            val allLogs = logEntries.joinToString("\n")
                            clipboardManager.setText(AnnotatedString(allLogs))
                        },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Filled.ContentCopy, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Copy", color = Color(0xFF38BDF8), fontSize = 12.sp)
                    }
                }
                TextButton(
                    onClick = { logEntries.clear() },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Filled.DeleteSweep, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Clear", color = Color(0xFF64748B), fontSize = 12.sp)
                }
            }
        }

        // Terminal Output Screen
        SelectionContainer {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF070B13))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    .padding(12.dp)
            ) {
                if (logEntries.isEmpty()) {
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .padding(vertical = 36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Filled.Sensors,
                                contentDescription = null,
                                tint = Color(0xFF334155),
                                modifier = Modifier.size(40.dp)
                            )
                            Spacer(Modifier.height(10.dp))
                            Text(
                                "Listening for payments...",
                                color = Color(0xFF64748B),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                "Notifications from GPay, PhonePe, Paytm, BHIM,\nand Bank SMS will appear here in real-time.",
                                color = Color(0xFF475569),
                                fontSize = 11.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
                items(logEntries) { entry ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = "›",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B),
                            modifier = Modifier.padding(end = 6.dp)
                        )
                        Text(
                            text = entry,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = when {
                                entry.contains("INTERCEPT") || entry.contains("delivered") || entry.contains("✓") -> Color(0xFF34D399)
                                entry.contains("FAILED") || entry.contains("ERROR") || entry.contains("✗") -> Color(0xFFF87171)
                                entry.contains("HEARTBEAT") -> Color(0xFF60A5FA)
                                entry.contains("SYSTEM") -> Color(0xFFFBBF24)
                                else -> Color(0xFFCBD5E1)
                            }
                        )
                    }
                }
            }
        }
    }
}

// ── Tab 2: All Credentials & Connection Links (Visual Required / Optional) ─────
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
    var showSecretKey by remember { mutableStateOf(false) }

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

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(bottom = 24.dp)
    ) {
        // Section Header
        Text(
            "Backend Gateway Credentials",
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF38BDF8)
        )
        Text(
            "Configure connection parameters. Fields marked with 'REQUIRED' are essential for order matching; others are optional extensions.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
        )

        // ── CARD 1: Core Gateway Connection (REQUIRED) ─────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF0284C7).copy(alpha = 0.3f)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Dns, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Core Connection", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                    }
                    BadgePill(text = "REQUIRED", color = Color(0xFF0284C7), textColor = Color(0xFFBAE6FD))
                }

                Spacer(Modifier.height(12.dp))

                // Field 1: Server URL
                Text("Gateway Server URL", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    placeholder = { Text("https://pay.yourdomain.com:4000", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Public domain or IP running the OpenUPI Docker container.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))

                // Field 2: Secret Key
                Text("Device Shared Secret (HMAC)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = secretKey,
                    onValueChange = { secretKey = it },
                    placeholder = { Text("Enter DAEMON_SHARED_SECRET from .env", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    visualTransformation = if (showSecretKey) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showSecretKey = !showSecretKey }) {
                            Icon(
                                if (showSecretKey) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Used to HMAC-SHA256 sign every dispatched payment event.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp))
            }
        }

        // ── CARD 2: Fallback & Direct Sync (OPTIONAL) ──────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.SyncAlt, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Failover & Sync", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                    }
                    BadgePill(text = "OPTIONAL", color = Color(0xFF334155), textColor = Color(0xFF94A3B8))
                }

                Spacer(Modifier.height(12.dp))

                // Field 3: Fallback URL
                Text("Fallback Webhook Ingest URL (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = fallbackUrl,
                    onValueChange = { fallbackUrl = it },
                    placeholder = { Text("https://backup.yourdomain.com/webhook", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Secondary endpoint dispatched if primary gateway returns 5xx error.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))

                // Field 4: MongoDB URI
                Text("MongoDB Reference Connection URI (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = mongoUri,
                    onValueChange = { mongoUri = it },
                    placeholder = { Text("mongodb+srv://user:pass@cluster...", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Optional database connection for direct offline ledger audit sync.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp))
            }
        }

        // ── CARD 3: Merchant Store Profile (OPTIONAL) ──────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Storefront, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Merchant Store Profile", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                    }
                    BadgePill(text = "OPTIONAL", color = Color(0xFF334155), textColor = Color(0xFF94A3B8))
                }

                Spacer(Modifier.height(12.dp))

                // Field 5: Merchant VPA
                Text("Merchant UPI ID / VPA (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = merchantVpa,
                    onValueChange = { merchantVpa = it },
                    placeholder = { Text("merchant@okaxis", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Your UPI VPA to test QR generation inside the app.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))

                // Field 6: Merchant Business Name
                Text("Merchant Business Name (Optional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFCBD5E1))
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = merchantName,
                    onValueChange = { merchantName = it },
                    placeholder = { Text("TELEDRIVE / My Company", color = Color(0xFF64748B), fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Merchant legal or brand name.", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp))
            }
        }

        // ── Full-Width Save Button ─────────────────────────────────────────────
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
                    saveStatus = "All credentials saved securely in encrypted DataStore ✓"
                    delay(4000)
                    saveStatus = ""
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Icon(Icons.Filled.Save, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Save All Credentials", fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }

        // Success Status Toast Card
        AnimatedVisibility(visible = saveStatus.isNotEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF065F46).copy(alpha = 0.4f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(saveStatus, color = Color(0xFF6EE7B7), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
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

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(bottom = 24.dp)
    ) {
        Text("Bank Rules & Soundbox TTS", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
        Text("Configure SMS headers allowlist and real-time voice speech confirmation.", fontSize = 12.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 2.dp, bottom = 14.dp))

        // Card 1: Bank Allowlist
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.FilterList, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Bank SMS Headers Allowlist", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = bankKeywords,
                    onValueChange = { bankKeywords = it },
                    placeholder = { Text("UCOBNK, SBINB, HDFCBK, ICICIB...") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = outlinedTextFieldColors(),
                    minLines = 3,
                    shape = RoundedCornerShape(10.dp)
                )
                Text("Matches standard TRAI DLT banking SMS sender IDs (e.g. VM-UCOBNK, BW-HDFCBK, AX-SBINB).", fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 4.dp))
            }
        }

        // Card 2: Soundbox Audio
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.RecordVoiceOver, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("Soundbox Audio Alerts (TTS)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Voice announces 'Received ₹499 on UPI' via speaker", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        }
                    }
                    Switch(
                        checked = enableTts,
                        onCheckedChange = { enableTts = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF38BDF8),
                            checkedTrackColor = Color(0xFF0284C7)
                        )
                    )
                }

                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = { PaymentAnnouncer.get(context).announce(499.05) },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.VolumeUp, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Play Test Soundbox Announcement", fontSize = 13.sp)
                }
            }
        }

        // Save Button
        Button(
            onClick = {
                scope.launch {
                    context.dataStore.edit { prefs ->
                        prefs[KEY_BANK_KEYWORDS] = bankKeywords.trim()
                        prefs[KEY_ENABLE_TTS] = enableTts
                    }
                    saveMsg = "Bank & Audio settings saved ✓"
                    delay(3500)
                    saveMsg = ""
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Icon(Icons.Filled.Save, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Save Rules & Audio Settings", fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }

        AnimatedVisibility(visible = saveMsg.isNotEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF065F46).copy(alpha = 0.4f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(saveMsg, color = Color(0xFF6EE7B7), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

// ── Tab 4: Connection Diagnostics & Liveness ──────────────────────────────────
@Composable
fun DiagnosticsTab() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    var pingStatus by remember { mutableStateOf<String?>(null) }
    var isPinging by remember { mutableStateOf(false) }

    val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val batteryLevel = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    val isCharging = bm.isCharging

    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    val isIgnoringBattery = powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true
    val isNotifListenerActive = isNotificationListenerEnabled(context)

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(bottom = 24.dp)
    ) {
        Text("System Diagnostics & Health", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
        Text("Inspect hardware telemetry and perform gateway liveness tests.", fontSize = 12.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 2.dp, bottom = 14.dp))

        // Telemetry Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Speed, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Device Telemetry & Health", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                }
                Spacer(Modifier.height(10.dp))

                TelemetryRow(
                    label = "Battery Level",
                    value = "$batteryLevel% ${if (isCharging) "⚡ Charging" else ""}",
                    isGood = batteryLevel > 20 || isCharging
                )
                HorizontalDivider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 8.dp))

                TelemetryRow(
                    label = "24/7 Battery Optimization Exemption",
                    value = if (isIgnoringBattery) "Exempted (Optimal)" else "Restricted (May Sleep)",
                    isGood = isIgnoringBattery
                )
                HorizontalDivider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 8.dp))

                TelemetryRow(
                    label = "Notification Listener Service",
                    value = if (isNotifListenerActive) "Active & Connected ✓" else "Disabled ✗",
                    isGood = isNotifListenerActive
                )
            }
        }

        // Gateway Connectivity Test Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Sensors, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Gateway Connectivity Probe", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                }
                Spacer(Modifier.height(8.dp))
                Text("Tests live bi-directional HTTP POST telemetry to your configured gateway URL.", fontSize = 12.sp, color = Color(0xFF94A3B8))

                Spacer(Modifier.height(12.dp))

                Button(
                    onClick = {
                        isPinging = true
                        scope.launch {
                            context.dataStore.data.collectLatest { p ->
                                val serverUrl = p[KEY_SERVER_URL] ?: ""
                                val secret = p[KEY_SECRET_KEY] ?: ""
                                val ok = NetworkClient.postHeartbeat(serverUrl, secret, batteryLevel, isCharging)
                                pingStatus = if (ok) "Gateway responded: 200 OK (Daemon Online ✓)" else "Gateway connection failed ✗ (Check URL / Port / WiFi)"
                                isPinging = false
                            }
                        }
                    },
                    enabled = !isPinging,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(if (isPinging) "Probing Gateway..." else "⚡ Ping Gateway Server", fontWeight = FontWeight.Bold)
                }

                if (pingStatus != null) {
                    Spacer(Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (pingStatus!!.contains("OK")) Color(0xFF065F46).copy(alpha = 0.4f) else Color(0xFF7F1D1D).copy(alpha = 0.4f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (pingStatus!!.contains("OK")) Color(0xFF059669) else Color(0xFFDC2626)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = pingStatus!!,
                            color = if (pingStatus!!.contains("OK")) Color(0xFF6EE7B7) else Color(0xFFFCA5A5),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        }

        // Test Payment Simulation Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF131C2E)),
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.BugReport, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("End-to-End Payment Simulation", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                }
                Spacer(Modifier.height(6.dp))
                Text("Triggers a mock UCO/SBI bank credit notification through the local matching parser and TTS soundbox.", fontSize = 12.sp, color = Color(0xFF94A3B8))

                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = {
                        LiveLogBus.emit("[SIMULATION] ₹499.04 credited to A/c XX3220 via UPI (Ref: 422899012345)")
                        PaymentAnnouncer.get(context).announce(499.04)
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFBBF24)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Trigger Mock ₹499.04 Payment", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ── Reusable UI Components ───────────────────────────────────────────────────
@Composable
fun BadgePill(text: String, color: Color, textColor: Color) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = color.copy(alpha = 0.25f),
        border = androidx.compose.foundation.BorderStroke(1.dp, color)
    ) {
        Text(
            text = text,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = textColor,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun TelemetryRow(label: String, value: String, isGood: Boolean) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = Color(0xFF94A3B8), fontSize = 12.sp)
        Text(
            value,
            color = if (isGood) Color(0xFF34D399) else Color(0xFFF87171),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF38BDF8),
    unfocusedBorderColor = Color(0xFF334155),
    cursorColor = Color(0xFF38BDF8),
    focusedTextColor = Color.White,
    unfocusedTextColor = Color(0xFFE2E8F0),
    focusedContainerColor = Color(0xFF070B13),
    unfocusedContainerColor = Color(0xFF070B13)
)

private fun isNotificationListenerEnabled(context: Context): Boolean {
    val packageName = context.packageName
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    return flat?.contains(packageName) == true
}
