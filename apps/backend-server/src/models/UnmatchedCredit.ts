import mongoose, { Schema } from 'mongoose';

export interface IUnmatchedCredit {
  amount: number;
  utr?: string;
  sender: string;
  rawText: string;
  resolved: boolean;
  resolvedOrderId?: string;
  receivedAt: Date;
}

const UnmatchedCreditSchema = new Schema<IUnmatchedCredit>({
  amount: { type: Number, required: true },
  utr: { type: String, unique: true, sparse: true },
  sender: { type: String, default: '' },
  rawText: { type: String, default: '' },
  resolved: { type: Boolean, default: false },
  resolvedOrderId: { type: String },
  receivedAt: { type: Date, default: Date.now },
});

export const UnmatchedCredit = mongoose.model<IUnmatchedCredit>(
  'UnmatchedCredit',
  UnmatchedCreditSchema
);
