# OpenUPI Admin Dashboard

> **Next.js 14 Real-Time Merchant Control Panel.**  
> Provides settlement volume metrics, active pending QR monitors, live Android daemon telemetry (battery % and charging status), manual unmatched credit reconciliation, and CSV accounting ledger export.

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm" /></a>
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## 🚀 Running the Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

Visit `http://localhost:3000/admin` in your browser.

### Environment Configuration

Create `.env.local` inside `apps/dashboard`:

```env
NEXT_PUBLIC_OPENUPI_URL=http://localhost:4000
NEXT_PUBLIC_OPENUPI_KEY=sk_live_your_merchant_api_key
```
