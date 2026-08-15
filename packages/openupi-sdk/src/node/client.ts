import type {
  OpenUPIConfig,
  CreateOrderParams,
  OrderResponse,
  OrderStatusResponse,
  ClaimUtrResponse,
  AdminStatsResponse,
  TransactionItem,
  PaymentWebhookPayload
} from '../core/types.js';
import { verifyWebhookSignature, type VerifyWebhookParams } from '../core/verify.js';

/**
 * OpenUPI Node.js Client
 * =======================
 * The all-in-one backend SDK for managing zero-fee UPI payment orders,
 * verifying HMAC-signed bank credit webhooks, and querying transaction ledgers.
 *
 * @example
 * ```typescript
 * import { OpenUPI } from 'openupi-sdk';
 * const upi = new OpenUPI({
 *   apiUrl: 'https://pay.yourdomain.com',
 *   apiKey: process.env.OPENUPI_API_KEY!,
 * });
 *
 * const order = await upi.orders.create({ orderId: 'ORD_1', amount: 499 });
 * ```
 */
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
    /**
     * Creates a new payment order with deterministic paise slot allocation and QR code.
     */
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

    /**
     * Fetches current payment status of an order.
     */
    get: async (orderId: string): Promise<OrderStatusResponse> => {
      const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}/status`, {
        headers: { 'x-api-key': this.apiKey }
      });
      if (!res.ok) throw new Error(`[OpenUPI] Failed to fetch order status for ${orderId}`);
      return res.json() as Promise<OrderStatusResponse>;
    },

    /**
     * Reconciles an order with a customer or merchant provided 12-digit UTR.
     */
    claimUtr: async (orderId: string, utr: string): Promise<ClaimUtrResponse> => {
      const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}/claim-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr })
      });
      return res.json() as Promise<ClaimUtrResponse>;
    },

    /**
     * Returns the full SSE stream URL for real-time order status updates.
     */
    streamUrl: (orderId: string): string => {
      return `${this.baseUrl}/api/v1/orders/${orderId}/stream`;
    }
  };

  public admin = {
    /**
     * Retrieves overall gateway volume and settlement statistics.
     */
    stats: async (): Promise<AdminStatsResponse> => {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/stats`, {
        headers: { 'x-api-key': this.apiKey }
      });
      if (!res.ok) throw new Error('[OpenUPI] Failed to fetch admin stats');
      return res.json() as Promise<AdminStatsResponse>;
    },

    /**
     * Fetches paginated transaction ledger.
     */
    transactions: async (options?: { limit?: number; page?: number; status?: string }): Promise<{
      transactions: TransactionItem[];
      total: number;
      page: number;
      limit: number;
    }> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.page) params.set('page', options.page.toString());
      if (options?.status) params.set('status', options.status);

      const res = await fetch(`${this.baseUrl}/api/v1/admin/transactions?${params}`, {
        headers: { 'x-api-key': this.apiKey }
      });
      if (!res.ok) throw new Error('[OpenUPI] Failed to fetch transactions');
      return res.json() as Promise<any>;
    },

    /**
     * Fetches unmatched bank credits for manual reconciliation.
     */
    unmatched: async (): Promise<{ unmatched: any[] }> => {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/unmatched`, {
        headers: { 'x-api-key': this.apiKey }
      });
      if (!res.ok) throw new Error('[OpenUPI] Failed to fetch unmatched credits');
      return res.json() as Promise<any>;
    },

    /**
     * Reconciles an unmatched bank credit with an order ID.
     */
    reconcile: async (unmatchedCreditId: string, orderId: string): Promise<{ success: boolean; orderId: string; utr: string }> => {
      const res = await fetch(`${this.baseUrl}/api/v1/admin/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({ unmatchedCreditId, orderId })
      });
      if (!res.ok) throw new Error('[OpenUPI] Reconcile request failed');
      return res.json() as Promise<any>;
    },

    /**
     * Returns direct CSV export URL with authorization query or headers.
     */
    exportCsvUrl: (): string => {
      return `${this.baseUrl}/api/v1/admin/export/csv`;
    }
  };

  public webhooks = {
    /**
     * Verifies HMAC signature on incoming webhooks.
     */
    verify: (params: Omit<VerifyWebhookParams, 'secret'> & { secret?: string }) => {
      return verifyWebhookSignature({
        ...params,
        secret: params.secret || this.apiKey
      });
    }
  };
}
