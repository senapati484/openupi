# OpenUPI: Android Payment Listener & Free Smart Soundbox

> **The Hardware Interception & 100% Free UPI Soundbox App for OpenUPI.**  
> Listens for incoming UPI app push notifications (GPay, PhonePe, Paytm, BHIM, CRED) and Bank SMS alerts, announces instant voice confirmations through the phone speaker, and dispatches HMAC-signed payment events to your self-hosted backend.

<p align="center">
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## 📱 Features

1. **Standalone 0-Cost Smart Soundbox**:
   - **No backend server required!** Install on any spare Android phone, enable Notification Listener, and the phone will announce incoming payments out loud in real-time (e.g. *"Received 499 Rupees on UPI"*), replacing expensive hardware soundboxes.
2. **Dual Notification & Bank SMS Interception**:
   - Intercepts notifications from Google Pay, PhonePe, Paytm, BHIM, CRED, and all major Indian banking SMS alerts using Android's native `NotificationListenerService`.
3. **Automated Gateway Dispatch (Optional)**:
   - When paired with your OpenUPI backend, dispatches HMAC-SHA256 signed payment events to automatically match and confirm orders on your website.
4. **Offline Queue & Guaranteed Retries**:
   - Persists captured payments to a local **Room SQLite Database** and utilizes **Android WorkManager** for guaranteed delivery even during network dropouts.
5. **Periodic Telemetry & Heartbeat**:
   - Dispatches battery level (%), charging state, and connectivity status every 60 seconds.

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
