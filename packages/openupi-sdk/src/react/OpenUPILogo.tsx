import React from 'react';

export interface OpenUPILogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'mark' | 'full';
  dark?: boolean;
}

/**
 * OpenUPILogo
 * ===========
 * Official OpenUPI logo component rendered as crisp vector SVG.
 * Supports icon mark and full brand mark with customizable size and color theme.
 */
export const OpenUPILogo: React.FC<OpenUPILogoProps> = ({
  size = 32,
  className,
  style,
  variant = 'mark',
  dark = false,
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size.toString(), 10) || 32;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(6, numericSize * 0.25)}px`,
        ...style,
      }}
    >
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
      >
        {/* Hexagonal Outer Base */}
        <path
          d="M50 4 C52 4 54 5 55 6 L88 25 C91 27 93 30 93 33 L93 67 C93 70 91 73 88 75 L55 94 C53 95 51 96 50 96 C49 96 47 95 45 94 L12 75 C9 73 7 70 7 67 L7 33 C7 30 9 27 12 25 L45 6 C46 5 48 4 50 4 Z"
          fill={dark ? '#FFFFFF' : '#0F172A'}
        />
        {/* Inner Stylized U Shape */}
        <path
          d="M24 24 L38 32 L38 52 C38 60 43 65 50 65 C57 65 62 60 62 52 L62 32 L76 24 L76 53 C76 68 65 79 50 79 C35 79 24 68 24 53 Z"
          fill={dark ? '#0F172A' : '#FFFFFF'}
        />
      </svg>
      {variant === 'full' && (
        <span
          style={{
            fontSize: `${numericSize * 0.58}px`,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: dark ? '#FFFFFF' : '#0F172A',
            lineHeight: 1,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          Open<span style={{ color: '#0284C7' }}>UPI</span>
        </span>
      )}
    </div>
  );
};
