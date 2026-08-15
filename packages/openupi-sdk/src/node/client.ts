import type { OpenUPIConfig, CreateOrderParams, OrderResponse } from '../core/types.js';
import { verifyWebhookSignature, type VerifyWebhookParams } from '../core/verify.js';

export class OpenUPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: OpenUPIConfig) {
    if (!config.apiUrl) throw new Error('[OpenUPI] apiUrl is required');
    if (!config.apiKey) throw new Error('[OpenUPI] apiKey is required');
    
    this.baseUrl = config.apiUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  public orders = {
    create: async (params: CreateOrderParams): Promise<OrderResponse> => {
      const res = await fetch(`${this.baseUrl}/api/v1/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`[OpenUPI] Order creation failed (${res.status}): ${error}`);
      }

      return res.json() as Promise<OrderResponse>;
    },

    get: async (orderId: string): Promise<OrderResponse> => {
      const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}/status`, {
        headers: { 'x-api-key': this.apiKey }
      });
      if (!res.ok) throw new Error(`[OpenUPI] Failed to fetch order status`);
      return res.json() as Promise<OrderResponse>;
    }
  };

  public webhooks = {
    verify: (params: Omit<VerifyWebhookParams, 'secret'> & { secret?: string }) => {
      return verifyWebhookSignature({
        ...params,
        secret: params.secret || this.apiKey
      });
    }
  };
}
