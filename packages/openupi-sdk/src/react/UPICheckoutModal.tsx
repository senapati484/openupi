import React, { useEffect, useState } from 'react';
import { useUPIStatus } from './useUPIStatus.js';

export interface UPICheckoutModalProps {
  orderId: string;
  exactAmount: number;
  qrSvg: string;
  upiIntent: string;
  gatewayUrl: string;
  onSuccess: (payment: { utr: string }) => void;
  onExpire?: () => void;
}

export const UPICheckoutModal: React.FC<UPICheckoutModalProps> = ({
  orderId,
  exactAmount,
  qrSvg,
  upiIntent,
  gatewayUrl,
  onSuccess,
  onExpire
}) => {
  const [seconds, setSeconds] = useState(900);
  const paymentState = useUPIStatus(gatewayUrl, orderId);

  useEffect(() => {
    if (paymentState.status === 'PAID' && paymentState.utr) {
      onSuccess({ utr: paymentState.utr });
    }
  }, [paymentState, onSuccess]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  return (
    <div style={{
      maxWidth: '360px',
      padding: '24px',
      borderRadius: '16px',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
        Pay Exactly ₹{exactAmount.toFixed(2)}
      </h3>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
        Scan using Google Pay, PhonePe, or Paytm
      </p>

      <div 
        dangerouslySetInnerHTML={{ __html: qrSvg }} 
        style={{ width: '200px', height: '200px', margin: '0 auto' }} 
      />

      <div style={{ marginTop: '16px' }}>
        <a
          href={upiIntent}
          style={{
            display: 'block',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px'
          }}>
          Open UPI App
        </a>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
        Expires in: {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
      </div>
    </div>
  );
};
