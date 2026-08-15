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

## 🚀 Installation & Setup

### 1. Download the APK
- Download the latest `openupi-daemon.apk` from [SourceForge](https://sourceforge.net/projects/openupi/) or [GitHub Releases](https://github.com/senapati484/openupi/releases).
- Install on any dedicated Android phone (Android 8.0+ / API 26+).

### 2. Grant Permissions
When you open the app, you will be prompted to grant 3 key permissions:
- **SMS Permission** (`RECEIVE_SMS`, `READ_SMS`): Required to intercept bank credit SMS alerts.
- **Notification Access**: Required to read GPay, PhonePe, and Paytm transaction notifications.
- **Battery Optimization Exemption**: Required to ensure Android OS never sleeps or kills the background daemon.

### 3. Configure Settings
Open the **Credentials & Links** tab in the app and enter:
- **Gateway Server URL**: Your backend URL (e.g. `https://pay.yourdomain.com`).
- **Device Shared Secret**: The 32-byte secret key matching `DEVICE_SHARED_SECRET` in your server's `.env`.
- **Merchant VPA**: Your UPI ID (e.g. `yourbusiness@okaxis`).
- **Merchant Name**: Your business name displayed during UPI checkout.

### 4. Hardware Best Practice
- Keep the phone connected to power and Wi-Fi 24/7.
- Insert the SIM card linked to your business bank account.

---

## 🛠️ Building from Source

Open `apps/android-daemon` in **Android Studio** (Hedgehog or newer) and run:

```bash
cd apps/android-daemon
./gradlew assembleDebug
```

The APK will be generated at `app/build/outputs/apk/debug/app-debug.apk`.
