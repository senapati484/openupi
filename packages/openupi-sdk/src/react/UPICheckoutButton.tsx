import React from 'react';

export interface UPICheckoutButtonProps {
  upiIntent: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const UPICheckoutButton: React.FC<UPICheckoutButtonProps> = ({
  upiIntent,
  label = 'Pay via UPI App',
  className,
  style,
  onClick
}) => {
  const defaultStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    textAlign: 'center',
    cursor: 'pointer',
    ...style
  };

  return (
    <a
      href={upiIntent}
      className={className}
      style={defaultStyle}
      onClick={onClick}
    >
      {label}
    </a>
  );
};
