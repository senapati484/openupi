'use client';
import useSWR from 'swr';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_OPENUPI_URL || 'http://localhost:4000';
const KEY = process.env.NEXT_PUBLIC_OPENUPI_KEY || '';

const fetcher = (url: string) =>
  fetch(url, { headers: { 'x-api-key': KEY } }).then((r) => r.json());

interface Stats {
  settledVolume: number;
  settledCount: number;
  pendingCount: number;
  unmatchedCount: number;
}

interface Transaction {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  status: string;
  utr?: string;
  createdAt: string;
  paidAt?: string;
}

interface DaemonStatus {
  status: string;
  daemonConnected: boolean;
  reason?: string;
  telemetry?: { batteryLevel: number; isCharging: boolean; lastSeen: number };
}

export default function AdminDashboard() {
  const [page, setPage] = useState(1);
  const { data: stats } = useSWR<Stats>(`${API}/api/v1/admin/stats`, fetcher, { refreshInterval: 15000 });
  const { data: txData } = useSWR<{ transactions: Transaction[]; total: number }>(
    `${API}/api/v1/admin/transactions?limit=20&page=${page}`,
    fetcher,
    { refreshInterval: 10000 }
  );
  const { data: health } = useSWR<DaemonStatus>(
    `${API}/api/v1/internal/status`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleCSVExport = () => {
    window.open(`${API}/api/v1/admin/export/csv`, '_blank');
  };

  return (
    <div style={s.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <h1 style={s.title}>⚡ OpenUPI Admin</h1>
        <div style={s.daemonBadge(health?.daemonConnected)}>
          {health?.daemonConnected ? '🟢 Daemon Online' : '🔴 Daemon Offline'}
          {health?.telemetry && (
            <span style={s.battery}>
              {' '}· 🔋{health.telemetry.batteryLevel}%{health.telemetry.isCharging ? ' ⚡' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────── */}
      <div style={s.metricsRow}>
        {[
          { label: 'Total Settled', value: `₹${(stats?.settledVolume || 0).toLocaleString('en-IN')}`, color: '#10b981' },
          { label: 'Transactions', value: stats?.settledCount || 0, color: '#38bdf8' },
          { label: 'Pending Orders', value: stats?.pendingCount || 0, color: '#f59e0b' },
          { label: 'Unmatched Credits', value: stats?.unmatchedCount || 0, color: '#f87171' },
        ].map((m) => (
          <div key={m.label} style={s.metricCard}>
            <div style={{ ...s.metricValue, color: m.color }}>{m.value}</div>
            <div style={s.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Transaction Ledger ────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Transaction Ledger</h2>
          <button onClick={handleCSVExport} style={s.exportBtn}>⬇ Export CSV</button>
        </div>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Order ID', 'Amount', 'Exact', 'Status', 'UTR', 'Created', 'Paid At'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txData?.transactions.map((tx) => (
                <tr key={tx.orderId} style={s.tr}>
                  <td style={s.td}><code style={s.code}>{tx.orderId}</code></td>
                  <td style={s.td}>₹{tx.baseAmount.toFixed(2)}</td>
                  <td style={s.td}>₹{tx.exactAmount.toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={s.badge(tx.status)}>{tx.status}</span>
                  </td>
                  <td style={s.td}><code style={s.code}>{tx.utr || '—'}</code></td>
                  <td style={s.td}>{new Date(tx.createdAt).toLocaleString('en-IN')}</td>
                  <td style={s.td}>{tx.paidAt ? new Date(tx.paidAt).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.pagination}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={s.pageBtn}>← Prev</button>
          <span style={{ color: '#94a3b8' }}>Page {page} · {txData?.total || 0} total</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!txData || page * 20 >= txData.total}
            style={s.pageBtn}
          >Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Inline styles ────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '26px', fontWeight: 700, color: '#38bdf8' },
  daemonBadge: (online?: boolean) => ({
    padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
    backgroundColor: online ? '#065f46' : '#7f1d1d', color: online ? '#6ee7b7' : '#fca5a5',
  }),
  battery: { fontWeight: 400 },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  metricCard: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center' as const },
  metricValue: { fontSize: '28px', fontWeight: 700, marginBottom: '6px' },
  metricLabel: { fontSize: '13px', color: '#64748b' },
  section: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: 600 },
  exportBtn: { padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  tableWrapper: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '10px 14px', textAlign: 'left' as const, color: '#64748b', borderBottom: '1px solid #334155', fontWeight: 500 },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { padding: '10px 14px', color: '#cbd5e1', whiteSpace: 'nowrap' as const },
  code: { fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' },
  badge: (status: string) => ({
    padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
    backgroundColor: status === 'PAID' ? '#065f46' : status === 'PENDING' ? '#78350f' : status === 'EXPIRED' ? '#1e1b4b' : '#7f1d1d',
    color: status === 'PAID' ? '#6ee7b7' : status === 'PENDING' ? '#fde68a' : status === 'EXPIRED' ? '#c7d2fe' : '#fca5a5',
  }),
  pagination: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', justifyContent: 'center' },
  pageBtn: { padding: '6px 14px', backgroundColor: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' },
};
