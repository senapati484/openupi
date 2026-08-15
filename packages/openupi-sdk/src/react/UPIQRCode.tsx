import React, { useState } from 'react';

export interface UPIQRCodeProps {
  qrSvg: string;
  exactAmount: number;
  vpa?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const UPIQRCode: React.FC<UPIQRCodeProps> = ({
  qrSvg,
  exactAmount,
  vpa,
  className,
  style
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyVpa = () => {
    if (vpa && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        ...style
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: qrSvg }}
        style={{ width: '180px', height: '180px', margin: '0 auto' }}
      />
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
          ₹{exactAmount.toFixed(2)}
        </span>
        {vpa && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
            UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{vpa}</span>
            <button
              type="button"
              onClick={handleCopyVpa}
              style={{
                marginLeft: '6px',
                border: 'none',
                background: 'transparent',
                color: '#0284c7',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
