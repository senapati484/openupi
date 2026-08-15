import React, { useState, useEffect } from 'react';

export interface UPIMerchantDashboardProps {
  gatewayUrl: string;
  apiKey: string;
  title?: string;
  refreshIntervalMs?: number;
}

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

interface DaemonHealth {
  status: string;
  daemonConnected: boolean;
  reason?: string;
  telemetry?: { batteryLevel: number; isCharging: boolean; lastSeen: number };
}

/**
 * UPIMerchantDashboard
 * ====================
 * A prebuilt, drop-in admin dashboard widget for merchants and developers.
 * Renders real-time settlement metrics, transaction history ledger,
 * daemon connectivity indicator, and CSV accounting exporter.
 *
 * @example
 * ```tsx
 * import { UPIMerchantDashboard } from 'openupi-sdk/react';
 *
 * export default function AdminPage() {
 *   return (
 *     <UPIMerchantDashboard
 *       gatewayUrl="https://pay.yourdomain.com"
 *       apiKey={process.env.NEXT_PUBLIC_OPENUPI_KEY!}
 *     />
 *   );
 * }
 * ```
 */
export const UPIMerchantDashboard: React.FC<UPIMerchantDashboardProps> = ({
  gatewayUrl,
  apiKey,
  title = '⚡ OpenUPI Merchant Console',
  refreshIntervalMs = 10000
}) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTx, setTotalTx] = useState(0);
  const [page, setPage] = useState(1);
  const [health, setHealth] = useState<DaemonHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const cleanUrl = gatewayUrl.replace(/\/+$/, '');

  const fetchData = async () => {
    try {
      const headers = { 'x-api-key': apiKey };

      const [statsRes, txRes, healthRes] = await Promise.all([
        fetch(`${cleanUrl}/api/v1/admin/stats`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${cleanUrl}/api/v1/admin/transactions?limit=15&page=${page}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${cleanUrl}/api/v1/internal/status`).then(r => r.ok ? r.json() : null)
      ]);

      if (statsRes) setStats(statsRes);
      if (txRes) {
        setTransactions(txRes.transactions || []);
        setTotalTx(txRes.total || 0);
      }
      if (healthRes) setHealth(healthRes);
    } catch (err) {
      console.error('[OpenUPI Dashboard] Polling error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [gatewayUrl, apiKey, page]);

  const handleExportCsv = () => {
    window.open(`${cleanUrl}/api/v1/admin/export/csv`, '_blank');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{title}</h2>
          <span style={styles.subtitle}>Self-Hosted Zero-Fee Payment Infrastructure</span>
        </div>
        <div style={styles.badge(health?.daemonConnected)}>
          {health?.daemonConnected ? '🟢 Listener Daemon Online' : '🔴 Daemon Offline'}
          {health?.telemetry && (
            <span style={{ fontWeight: 400 }}>
              {' '}· 🔋{health.telemetry.batteryLevel}%{health.telemetry.isCharging ? ' ⚡' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#10b981' }}>
            ₹{(stats?.settledVolume || 0).toLocaleString('en-IN')}
          </div>
          <div style={styles.metricLabel}>Total Settled Volume</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#38bdf8' }}>
            {stats?.settledCount || 0}
          </div>
          <div style={styles.metricLabel}>Settled Transactions</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#f59e0b' }}>
            {stats?.pendingCount || 0}
          </div>
          <div style={styles.metricLabel}>Pending Active QRs</div>
        </div>
        <div style={styles.metricCard}>
          <div style={{ ...styles.metricVal, color: '#f87171' }}>
            {stats?.unmatchedCount || 0}
          </div>
          <div style={styles.metricLabel}>Unmatched Credits</div>
        </div>
      </div>

      {/* Transactions Section */}
      <div style={styles.ledgerSection}>
        <div style={styles.ledgerHeader}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Transaction Ledger</h3>
          <button type="button" onClick={handleExportCsv} style={styles.csvButton}>
            ⬇ Export CSV Ledger
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Order ID', 'Base Amt', 'Exact Paid', 'Status', 'Bank UTR', 'Date'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    {loading ? 'Loading transactions...' : 'No transactions recorded yet.'}
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.orderId} style={styles.tr}>
                    <td style={styles.td}><code style={styles.code}>{tx.orderId}</code></td>
                    <td style={styles.td}>₹{tx.baseAmount.toFixed(2)}</td>
                    <td style={styles.td}>₹{tx.exactAmount.toFixed(2)}</td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge(tx.status)}>{tx.status}</span>
                    </td>
                    <td style={styles.td}><code style={styles.code}>{tx.utr || '—'}</code></td>
                    <td style={styles.td}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.paginationRow}>
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={styles.pageBtn}
          >
            ← Previous
          </button>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
            Page {page} · {totalTx} Total Orders
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page * 15 >= totalTx}
            style={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '24px',
    borderRadius: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '12px'
  },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#38bdf8' },
  subtitle: { fontSize: '12px', color: '#64748b' },
  badge: (online?: boolean) => ({
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: online ? '#065f46' : '#7f1d1d',
    color: online ? '#6ee7b7' : '#fca5a5'
  }),
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  metricCard: {
    backgroundColor: '#1e293b',
    borderRadius: '10px',
    padding: '16px',
    textAlign: 'center' as const
  },
  metricVal: { fontSize: '22px', fontWeight: 700, marginBottom: '4px' },
  metricLabel: { fontSize: '12px', color: '#64748b' },
  ledgerSection: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px' },
  ledgerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  csvButton: {
    padding: '6px 14px',
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    color: '#64748b',
    borderBottom: '1px solid #334155',
    fontWeight: 500
  },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { padding: '10px 12px', color: '#cbd5e1', whiteSpace: 'nowrap' as const },
  code: { fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' },
  statusBadge: (status: string) => ({
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: status === 'PAID' ? '#065f46' : status === 'PENDING' ? '#78350f' : '#7f1d1d',
    color: status === 'PAID' ? '#6ee7b7' : status === 'PENDING' ? '#fde68a' : '#fca5a5'
  }),
  paginationRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px'
  },
  pageBtn: {
    padding: '6px 12px',
    backgroundColor: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  }
};
