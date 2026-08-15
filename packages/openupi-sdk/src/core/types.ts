export interface OpenUPIConfig {
  /** Base URL of your self-hosted OpenUPI backend gateway (e.g. https://pay.yourdomain.com) */
  apiUrl: string;
  /** Merchant API Secret Key from .env (MERCHANT_API_KEY) */
  apiKey: string;
  /** Optional Merchant VPA / UPI ID override */
  merchantVpa?: string;
  /** Optional Merchant Business Name override */
  merchantName?: string;
}

export interface CreateOrderParams {
  /** Unique Order ID from your system (e.g. ORD_1001, INV_9876) */
  orderId: string;
  /** Base order amount in INR (e.g. 499) */
  amount: number;
  /** Optional payment note displayed on customer UPI screen */
  note?: string;
  /** Webhook callback URL where OpenUPI will post payment confirmation */
  callbackUrl?: string;
  /** Optional customer UPI VPA */
  customerVpa?: string;
}

export interface OrderResponse {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  vpa: string;
  upiIntent: string;
  qrSvg: string;
  expiresAt: string;
}

export interface OrderStatusResponse {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'PAID_LATE';
  utr?: string;
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ClaimUtrResponse {
  success: boolean;
  status: string;
  message: string;
  utr?: string;
}

export interface PaymentWebhookPayload {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  utr: string;
  status: 'PAID' | 'FAILED' | 'EXPIRED' | 'PAID_LATE';
}

export interface TransactionItem {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  status: string;
  utr?: string;
  createdAt: string;
  paidAt?: string;
}

export interface AdminStatsResponse {
  settledVolume: number;
  settledCount: number;
  pendingCount: number;
  unmatchedCount: number;
}

export interface WebhookHandlerOptions {
  /** Merchant Secret Key for verifying HMAC signature */
  secret: string;
  /** Handler called when a payment is verified as PAID */
  onPaymentSuccess: (event: PaymentWebhookPayload) => Promise<void> | void;
  /** Optional handler called if a payment arrives late after expiration */
  onPaymentLate?: (event: PaymentWebhookPayload) => Promise<void> | void;
  /** Optional error handler */
  onError?: (err: Error) => void;
  /** Signature timestamp tolerance window in milliseconds (default: 300000 / 5 mins) */
  toleranceMs?: number;
}
