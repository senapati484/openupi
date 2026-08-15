# OpenUPI Android Daemon

> **The Hardware Interception & Soundbox App for OpenUPI.**  
> Listens for incoming bank SMS alerts and UPI app push notifications (GPay, PhonePe, Paytm), dispatches HMAC-signed payment events to your self-hosted backend, and announces audio confirmations via TTS.

<p align="center">
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## 📱 Features

1. **Dual Interception Engine**:
   - **Native Bank SMS**: Intercepts `android.provider.Telephony.SMS_RECEIVED` directly from the telephony layer for all major Indian banks (SBI, HDFC, ICICI, Axis, Kotak, UCO Bank, Union Bank, etc.).
   - **UPI Push Notifications**: Intercepts notifications from Google Pay, PhonePe, Paytm, and BHIM using Android `NotificationListenerService`.
2. **Built-in Soundbox TTS**:
   - Speaks payment confirmations through the phone speaker (e.g. *"Received 499 Rupees and 4 paise on UPI"*).
3. **Offline Queue & Retries**:
   - Persists all captured payments to a local **Room SQLite Database** before network dispatch.
   - Uses **Android WorkManager** with network constraints to guarantee delivery even during temporary Wi-Fi / cellular dropouts.
4. **HMAC-SHA256 Security**:
   - Every outgoing HTTP payload is signed using a 32-byte shared secret key with strict 5-minute replay window timestamp verification.
5. **Periodic Heartbeat & Telemetry**:
   - Dispatches battery level (%), charging state, and connectivity status every 60 seconds to your backend server.

---

## 🚀 Installation & Sideloading Guide

### 1. Download the APK
- Download the latest **`openupi-daemon-v1.0.0.apk`** from [SourceForge](https://sourceforge.net/projects/openupi/) or [GitHub Releases](https://github.com/senapati484/openupi/releases).

---

### 2. Google Play Protect Sideloading Notice (Important)
Because OpenUPI is a self-hosted financial listener that reads incoming UPI transaction alerts, Google Play Protect's automated heuristic scanner will flag/block sideloading when installed outside the Play Store.

#### How to install:
- **Option A (Phone Play Store Settings)**:
  1. Open the **Google Play Store** app.
  2. Tap your **Profile Icon** (top right) ➔ **Play Protect**.
  3. Tap the **Settings (⚙️)** gear in the top-right corner.
  4. Turn **OFF** both:
     - **"Scan apps with Play Protect"**
     - **"Improve harmful app detection"**
  5. Open your phone's **Files / Downloads** app and install `openupi-daemon-v1.0.0.apk`.
- **Option B (Via ADB — Direct Developer Sideload)**:
  ```bash
  adb install -r exports/openupi-daemon-v1.0.0.apk
  ```

---

### 3. Grant Permissions & Unlock Restricted Settings (Android 13+)
1. **Notification Access**: Tap **Enable** inside the app to allow the daemon to intercept UPI app payments (Google Pay, PhonePe, Paytm, BHIM, CRED, Bank apps, and Bank SMS alerts).
2. **Android 13+ Restricted Settings**: If Android blocks the toggle with *"Restricted setting"*:
   - Go to phone **Settings ➔ Apps ➔ OpenUPI Daemon**.
   - Tap the **3 vertical dots (⋮)** in the top-right corner ➔ **"Allow restricted settings"** (authenticate with Fingerprint/PIN).
   - Return to OpenUPI Daemon and toggle on **Notification Listener**.
3. **Battery Optimization Exemption**: Keep background execution exempt from OS battery killing for 24/7 reliability.

---

### 4. Configure Backend Credentials
Open the **Credentials** tab in the app:
- **Gateway Server URL** (`REQUIRED`): Your Fastify backend URL (e.g. `https://pay.yourdomain.com:4000`).
- **Device Shared Secret** (`REQUIRED`): The 32-byte secret key matching `DAEMON_SHARED_SECRET` in `.env`.
- **Fallback Webhook URL** (`OPTIONAL`): Secondary failover URL if primary server is unreachable.
- **Merchant VPA / Name** (`OPTIONAL`): Your business UPI ID (e.g. `merchant@okaxis`) for in-app test QRs.

Tap **Save All Credentials**.

---

### 5. Hardware Best Practices
- Keep the dedicated phone connected to power and Wi-Fi 24/7.
- Ensure the phone receives push notifications from your business UPI & Banking apps.

---

## 🛠️ Building from Source

Open `apps/android-daemon` in **Android Studio** (Hedgehog or newer) and run:

```bash
cd apps/android-daemon
./gradlew assembleDebug
```

The APK will be generated at `app/build/outputs/apk/debug/app-debug.apk`.
