// Context provider — initialize once at app root
export { OpenUPIProvider, useOpenUPIContext } from './OpenUPIProvider.js';
export type { OpenUPIContextValue } from './OpenUPIProvider.js';

// Checkout widgets
export { UPICheckoutModal } from './UPICheckoutModal.js';
export { UPICheckoutButton } from './UPICheckoutButton.js';
export { UPIQRCode } from './UPIQRCode.js';

// Admin dashboard widget
export { UPIMerchantDashboard } from './UPIMerchantDashboard.js';

// Branding
export { OpenUPILogo } from './OpenUPILogo.js';

// Headless hook
export { useUPIStatus } from './useUPIStatus.js';

// Types
export type { UPICheckoutModalProps } from './UPICheckoutModal.js';
export type { UPICheckoutButtonProps } from './UPICheckoutButton.js';
export type { UPIQRCodeProps } from './UPIQRCode.js';
export type { UPIMerchantDashboardProps } from './UPIMerchantDashboard.js';
export type { OpenUPILogoProps } from './OpenUPILogo.js';
export type { UPIStatusState } from './useUPIStatus.js';
