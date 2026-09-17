import { z } from 'zod';

export const createSaleSchema = z.object({
  storeId:       z.string().uuid(),
  invoiceDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerId:    z.string().uuid().optional().nullable(),
  customerName:  z.string().max(255).optional().nullable(),
  customerPhone: z.string().max(50).optional().nullable(),
  discountAmount:z.number().min(0).optional(),
  notes:         z.string().optional().nullable(),
  items: z.array(z.object({
    productId:      z.string().uuid(),
    variantId:      z.string().uuid().optional().nullable(),
    quantity:       z.number().int().min(1),
    unitPrice:      z.number().min(0),
    discountAmount: z.number().min(0).optional(),
    taxRate:        z.number().min(0).max(100).optional(),
    notes:          z.string().optional().nullable(),
  })).min(1, 'At least one item required'),
  payments: z.array(z.object({
    paymentMode:     z.enum(['cash', 'bank', 'credit']),
    accountId:       z.string().uuid().optional().nullable(),
    amount:          z.number().min(0.01),
    paymentDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    referenceNumber: z.string().max(100).optional().nullable(),
    notes:           z.string().optional().nullable(),
  })).optional(),
});

export const addSalePaymentSchema = z.object({
  paymentMode:     z.enum(['cash', 'bank', 'credit']),
  accountId:       z.string().uuid().optional().nullable(),
  amount:          z.number().min(0.01),
  paymentDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes:           z.string().optional().nullable(),
});
