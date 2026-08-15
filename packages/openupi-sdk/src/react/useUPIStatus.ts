import { useEffect, useRef, useState } from 'react';

export interface UPIStatusState {
  status: 'PENDING' | 'PAID' | 'PAID_LATE' | 'EXPIRED' | 'ERROR';
  utr?: string;
  error?: string;
}

const TERMINAL_STATUSES = new Set(['PAID', 'PAID_LATE', 'EXPIRED']);
const MAX_RECONNECT_DELAY_MS = 30_000; // cap at 30s

/**
 * useUPIStatus
 * ============
 * Headless React hook that subscribes to real-time payment updates via Server-Sent Events (SSE).
 * Handles PAID, PAID_LATE, EXPIRED statuses and performs automatic exponential-backoff
 * reconnection on network interruptions.
 *
 * @param gatewayUrl - Base URL of your OpenUPI gateway
 * @param orderId - The order ID to listen for
 * @returns UPIStatusState with `status`, optional `utr`, and optional `error`
 *
 * @example
 * ```tsx
 * const { status, utr } = useUPIStatus('https://pay.yourdomain.com', 'ORD_1001');
 *
 * if (status === 'PAID' || status === 'PAID_LATE') {
 *   return <SuccessScreen utr={utr!} />;
 * }
 * ```
 */
export function useUPIStatus(gatewayUrl: string, orderId: string): UPIStatusState {
  const [state, setState] = useState<UPIStatusState>({ status: 'PENDING' });
  const reconnectDelay = useRef<number>(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!gatewayUrl || !orderId) return;

    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;

      const sanitizedUrl = gatewayUrl.replace(/\/+$/, '');
      const sse = new EventSource(`${sanitizedUrl}/api/v1/orders/${orderId}/stream`);
      eseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { status?: string; utr?: string };

          if (data.status === 'PAID') {
            setState({ status: 'PAID', utr: data.utr });
            sse.close();
          } else if (data.status === 'PAID_LATE') {
            setState({ status: 'PAID_LATE', utr: data.utr });
            sse.close();
          } else if (data.status === 'EXPIRED') {
            setState({ status: 'EXPIRED' });
            sse.close();
          }
          // reset reconnect delay on any successful message
          reconnectDelay.current = 1_000;
        } catch {
          setState({ status: 'ERROR', error: 'Malformed stream packet' });
          sse.close();
        }
      };

      sse.onerror = () => {
        sse.close();
        eseRef.current = null;

        // Don't reconnect for terminal statuses
        setState((prev) => {
          if (TERMINAL_STATUSES.has(prev.status)) return prev;

          // Schedule exponential backoff reconnect
          if (!isCancelled) {
            reconnectTimer.current = setTimeout(() => {
              reconnectDelay.current = Math.min(
                reconnectDelay.current * 2,
                MAX_RECONNECT_DELAY_MS
              );
              connect();
            }, reconnectDelay.current);
          }
          return prev;
        });
      };
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      eseRef.current?.close();
    };
  }, [gatewayUrl, orderId]);

  return state;
}
