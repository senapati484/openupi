# OpenUPI for WooCommerce

> **Zero-Fee UPI Payment Gateway Plugin for WordPress / WooCommerce.**  
> Accept payments directly into your bank account with no intermediary gateway deductions (0% fees).

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm" /></a>
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## 🛍️ Installation

1. Copy the `plugins/openupi-woocommerce` folder into your WordPress site at `wp-content/plugins/openupi-woocommerce/`.
2. Go to **WordPress Admin → Plugins → Installed Plugins** and click **Activate** on **OpenUPI for WooCommerce**.
3. Go to **WooCommerce → Settings → Payments → OpenUPI** and configure:
   - **OpenUPI Server URL**: Your backend URL (e.g. `https://pay.yourdomain.com`).
   - **Merchant API Key**: Your `MERCHANT_API_KEY` from `.env`.
4. Click **Save changes**.

---

## 🔄 How the WooCommerce Flow Works

1. Customer chooses **Pay via UPI** at WooCommerce checkout.
2. The plugin requests a unique paise-offset order from your OpenUPI server.
3. The customer scans the dynamic QR or taps the UPI Intent link.
4. When the customer pays, the Android daemon intercepts the credit and notifies OpenUPI.
5. OpenUPI dispatches an HMAC-signed webhook to `/wc-api/openupi_webhook/`.
6. WooCommerce marks the order as **Processing / Completed** with the bank UTR recorded in the order notes.
