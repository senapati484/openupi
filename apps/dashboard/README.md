# OpenUPI Admin Dashboard

> **Next.js 14 Real-Time Merchant Control Panel.**  
> Provides settlement volume metrics, active pending QR monitors, live Android daemon telemetry (battery % and charging status), manual unmatched credit reconciliation, and CSV accounting ledger export.

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
