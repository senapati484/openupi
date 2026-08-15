import { useEffect, useState } from 'react';

export interface UPIStatusState {
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'PAID_LATE' | 'ERROR';
  utr?: string;
  error?: string;
}

export function useUPIStatus(gatewayUrl: string, orderId: string) {
  const [state, setState] = useState<UPIStatusState>({ status: 'PENDING' });

  useEffect(() => {
    if (!gatewayUrl || !orderId || state.status === 'PAID') return;

    const sanitizedUrl = gatewayUrl.replace(/\/+$/, '');
    const sse = new EventSource(`${sanitizedUrl}/api/v1/orders/${orderId}/stream`);

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'PAID') {
          setState({ status: 'PAID', utr: data.utr });
          sse.close();
        } else if (data.status === 'EXPIRED') {
          setState({ status: 'EXPIRED' });
          sse.close();
        }
      } catch (err) {
        setState({ status: 'ERROR', error: 'Malformed stream packet' });
      }
    };

    sse.onerror = () => {
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [gatewayUrl, orderId, state.status]);

  return state;
}
