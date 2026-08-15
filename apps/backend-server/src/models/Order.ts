import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'PAID_LATE';

export interface IOrder extends Document {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  status: OrderStatus;
  vpa: string;
  utr?: string;
  callbackUrl?: string;
  customerVpa?: string;
  note?: string;
  expiresAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    baseAmount: { type: Number, required: true },
    exactAmount: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'EXPIRED', 'PAID_LATE'],
      default: 'PENDING',
      index: true,
    },
    vpa: { type: String, required: true },
    // Sparse + unique ensures idempotency: same UTR cannot confirm two orders
    utr: { type: String, sparse: true, unique: true },
    callbackUrl: { type: String },
    customerVpa: { type: String },
    note: { type: String },
    // MongoDB TTL index auto-removes expired PENDING documents after 15 min
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for fast paise-offset lookups during ingestion
OrderSchema.index({ exactAmount: 1, status: 1, expiresAt: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
