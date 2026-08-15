import React, { createContext, useContext } from 'react';

/**
 * Configuration for the OpenUPI React context.
 */
export interface OpenUPIContextValue {
  /** Base URL of your self-hosted OpenUPI gateway (e.g. https://pay.yourdomain.com) */
  gatewayUrl: string;
  /**
   * Public-facing API key for the merchant dashboard widget.
   * ⚠️ Only expose this if your gateway is protected by authentication.
   */
  apiKey?: string;
}

const OpenUPIContext = createContext<OpenUPIContextValue | null>(null);

/**
 * OpenUPIProvider
 * ===============
 * Wraps your application (or checkout section) with OpenUPI configuration.
 * Allows child components to consume `gatewayUrl` / `apiKey` without prop-drilling.
 *
 * @example
 * ```tsx
 * // _app.tsx or layout.tsx
 * import { OpenUPIProvider } from 'openupi-sdk/react';
 *
 * export default function App({ Component, pageProps }) {
 *   return (
 *     <OpenUPIProvider gatewayUrl="https://pay.yourdomain.com">
 *       <Component {...pageProps} />
 *     </OpenUPIProvider>
 *   );
 * }
 * ```
 */
export function OpenUPIProvider({
  gatewayUrl,
  apiKey,
  children,
}: OpenUPIContextValue & { children: React.ReactNode }) {
  return (
    <OpenUPIContext.Provider value={{ gatewayUrl, apiKey }}>
      {children}
    </OpenUPIContext.Provider>
  );
}

/**
 * Returns the OpenUPI context value set by the nearest `<OpenUPIProvider>`.
 * Throws a descriptive error if used outside of a provider.
 *
 * @example
 * ```tsx
 * import { useOpenUPIContext } from 'openupi-sdk/react';
 *
 * function MyCheckout({ order }) {
 *   const { gatewayUrl } = useOpenUPIContext();
 *   return <UPICheckoutModal gatewayUrl={gatewayUrl} {...order} onSuccess={...} />;
 * }
 * ```
 */
export function useOpenUPIContext(): OpenUPIContextValue {
  const ctx = useContext(OpenUPIContext);
  if (!ctx) {
    throw new Error(
      '[OpenUPI] useOpenUPIContext() must be used inside <OpenUPIProvider>. ' +
        'Wrap your app or checkout section with: <OpenUPIProvider gatewayUrl="https://...">'
    );
  }
  return ctx;
}
