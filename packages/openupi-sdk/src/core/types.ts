export interface OpenUPIConfig {
  apiUrl: string;
  apiKey: string;
}

export interface CreateOrderParams {
  orderId: string;
  amount: number;
  note?: string;
  callbackUrl?: string;
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

export interface PaymentWebhookPayload {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  utr: string;
  status: 'PAID' | 'FAILED' | 'EXPIRED';
}
