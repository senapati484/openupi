import React, { useEffect, useState } from 'react';
import { useUPIStatus } from './useUPIStatus.js';
import { OpenUPILogo } from './OpenUPILogo.js';

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
  const [showUtrInput, setShowUtrInput] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const paymentState = useUPIStatus(gatewayUrl, orderId);

  useEffect(() => {
    if (
      (paymentState.status === 'PAID' || paymentState.status === 'PAID_LATE') &&
      paymentState.utr
    ) {
      onSuccess({ utr: paymentState.utr });
    }
    if (paymentState.status === 'EXPIRED') {
      onExpire?.();
    }
  }, [paymentState.status, paymentState.utr, onSuccess, onExpire]);

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

  const handleClaimUtr = async () => {
    if (!utrInput.trim() || utrInput.trim().length < 6) {
      setClaimStatus('Please enter a valid 12-digit UPI UTR');
      return;
    }
    setIsClaiming(true);
    setClaimStatus(null);
    try {
      const res = await fetch(`${gatewayUrl.replace(/\/+$/, '')}/api/v1/orders/${orderId}/claim-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utrInput.trim() })
      });
      const data = await res.json();
      if (data.success && data.status === 'PAID') {
        setClaimStatus('Payment verified successfully! ✓');
        onSuccess({ utr: utrInput.trim() });
      } else {
        setClaimStatus(data.message || 'Payment awaiting bank confirmation...');
      }
    } catch {
      setClaimStatus('Could not verify UTR. Please wait for automatic match.');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div style={{
      maxWidth: '380px',
      padding: '24px',
      borderRadius: '20px',
      backgroundColor: '#ffffff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
        <OpenUPILogo size={22} variant="mark" />
        <span style={{ backgroundColor: '#F0FDF4', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
          ZERO EXTRA FEES • DIRECT SETTLEMENT
        </span>
      </div>

      <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
        Pay Exactly ₹{exactAmount.toFixed(2)}
      </h3>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
        Scan QR with Google Pay, PhonePe, Paytm, or BHIM
      </p>

      <div 
        dangerouslySetInnerHTML={{ __html: qrSvg }} 
        style={{ width: '210px', height: '210px', margin: '0 auto', background: '#F8FAFC', padding: '8px', borderRadius: '12px', border: '1px solid #E2E8F0' }} 
      />

      <div style={{ marginTop: '16px' }}>
        <a
          href={upiIntent}
          style={{
            display: 'block',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'background 0.2s ease'
          }}>
          📱 Tap to Pay on Mobile
        </a>
      </div>

      <div style={{ marginTop: '14px', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Status:{' '}
          <strong style={{
            color:
              paymentState.status === 'PAID' || paymentState.status === 'PAID_LATE' ? '#16A34A'
              : paymentState.status === 'EXPIRED' ? '#DC2626'
              : paymentState.status === 'ERROR' ? '#D97706'
              : '#0284c7'
          }}>
            {paymentState.status === 'PENDING' ? 'Listening for payment...' : null}
            {paymentState.status === 'PAID' ? '✓ Payment Received!' : null}
            {paymentState.status === 'PAID_LATE' ? '✓ Payment Received (Late)' : null}
            {paymentState.status === 'EXPIRED' ? '⏱ Order Expired' : null}
            {paymentState.status === 'ERROR' ? '⚠ Stream Error — Reconnecting...' : null}
          </strong>
        </span>
        <span>⏱ {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</span>
      </div>

      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0' }}>
        {!showUtrInput ? (
          <button
            type="button"
            onClick={() => setShowUtrInput(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}>
            Paid but not verified? Enter 12-Digit UTR
          </button>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              12-Digit Bank UTR / Reference Number:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="e.g. 422812345678"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                maxLength={16}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={handleClaimUtr}
                disabled={isClaiming}
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isClaiming ? 'not-allowed' : 'pointer'
                }}>
                {isClaiming ? '...' : 'Verify'}
              </button>
            </div>
            {claimStatus && (
              <div style={{
                fontSize: '11px',
                marginTop: '6px',
                color: claimStatus.includes('✓') ? '#16A34A' : '#E11D48',
                fontWeight: 500
              }}>
                {claimStatus}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Secured by</span>
        <OpenUPILogo size={14} variant="full" />
      </div>
    </div>
  );
};
