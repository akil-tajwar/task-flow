import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const itemSchema = z.object({
  productId:  z.string().uuid(),
  variantId:  z.string().uuid().nullable().optional(),
  poItemId:   z.string().uuid().nullable().optional(),
  quantity:   z.number().int().min(1),
  unitPrice:  z.number().min(0),
  taxRate:    z.number().min(0).max(100).optional().default(0),
  notes:      z.string().max(500).optional(),
});

const paymentSchema = z.object({
  paymentMode:     z.enum(['cash', 'bank', 'credit']),
  accountId:       z.string().uuid().nullable().optional(),
  amount:          z.number().positive(),
  referenceNumber: z.string().max(100).optional(),
  notes:           z.string().max(500).optional(),
  paymentDate:     dateStr.optional(),
}).refine(
  (v) => v.paymentMode === 'credit' || !!v.accountId,
  { message: 'accountId is required for cash/bank payments', path: ['accountId'] },
);

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const createPOSchema = z.object({
  vendorId:     z.string().uuid(),
  storeId:      z.string().uuid(),
  orderDate:    dateStr,
  expectedDate: dateStr.optional(),
  notes:        z.string().max(1000).optional(),
  items:        z.array(itemSchema).min(1),
});
export type CreatePOInput = z.infer<typeof createPOSchema>;

export const updatePOStatusSchema = z.object({
  status: z.enum(['sent', 'cancelled']),
});
export type UpdatePOStatusInput = z.infer<typeof updatePOStatusSchema>;

// ─── Purchase Receipts ────────────────────────────────────────────────────────

export const createPRSchema = z.object({
  vendorId:    z.string().uuid(),
  storeId:     z.string().uuid(),
  poId:        z.string().uuid().nullable().optional(),
  receiptDate: dateStr,
  notes:       z.string().max(1000).optional(),
  items:       z.array(itemSchema).min(1),
  payments:    z.array(paymentSchema).optional().default([]),
});
export type CreatePRInput = z.infer<typeof createPRSchema>;

export const addPaymentSchema = z.object({
  paymentMode:     z.enum(['cash', 'bank', 'credit']),
  accountId:       z.string().uuid().nullable().optional(),
  amount:          z.number().positive(),
  paymentDate:     dateStr,
  referenceNumber: z.string().max(100).optional(),
  notes:           z.string().max(500).optional(),
}).refine(
  (v) => v.paymentMode === 'credit' || !!v.accountId,
  { message: 'accountId is required for cash/bank payments', path: ['accountId'] },
);
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
