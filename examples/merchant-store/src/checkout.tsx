import React, { useState } from 'react';
import { UPICheckoutModal, UPICheckoutButton, useUPIStatus } from 'openupi-sdk/react';

interface OrderData {
  orderId: string;
  exactAmount: number;
  qrSvg: string;
  upiIntent: string;
}

/**
 * Example Checkout Page Component for any React / Next.js e-commerce website
 */
export const MerchantCheckoutPage: React.FC = () => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [paidUtr, setPaidUtr] = useState<string | null>(null);

  const handleCreateOrder = async (amount: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customerName: 'Aarav Sharma',
          planName: 'Pro Annual Pass',
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setLoading(false);
    }
  };

  if (paidUtr) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#16a34a' }}>🎉 Payment Successful!</h2>
        <p>Your subscription is now active.</p>
        <p style={{ color: '#64748b' }}>Bank UTR: <code>{paidUtr}</code></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <h2>Upgrade to Pro Plan</h2>
      <p style={{ color: '#64748b' }}>Price: ₹499 / year (Zero platform fees)</p>

      {!order ? (
        <button
          onClick={() => handleCreateOrder(499)}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Generating UPI QR...' : 'Pay with UPI (₹499)'}
        </button>
      ) : (
        <div>
          {/* Modal / Widget from openupi-sdk/react */}
          <UPICheckoutModal
            orderId={order.orderId}
            exactAmount={order.exactAmount}
            qrSvg={order.qrSvg}
            upiIntent={order.upiIntent}
            gatewayUrl="http://localhost:4000"
            onSuccess={({ utr }) => {
              setPaidUtr(utr);
            }}
            onExpire={() => {
              alert('Payment session expired. Please regenerate QR.');
              setOrder(null);
            }}
          />

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Or pay directly on mobile:</p>
            <UPICheckoutButton upiIntent={order.upiIntent} label="Open Google Pay / PhonePe" />
          </div>
        </div>
      )}
    </div>
  );
};
