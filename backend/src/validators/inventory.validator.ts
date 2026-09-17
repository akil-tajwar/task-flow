import { z } from 'zod';

const movementTypes = ['receive', 'adjustment', 'damage', 'return'] as const;

export const adjustStockSchema = z.object({
  storeId:   z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  type:      z.enum(movementTypes),
  quantity:  z.number().int().min(1),
  notes:     z.string().max(1000).optional(),
});

const transferItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity:  z.number().int().min(1),
});

export const createTransferSchema = z.object({
  fromStoreId: z.string().uuid(),
  toStoreId:   z.string().uuid(),
  items:       z.array(transferItemSchema).min(1),
  notes:       z.string().max(1000).optional(),
}).refine((d) => d.fromStoreId !== d.toStoreId, { message: 'Source and destination stores must differ' });

const openingBalanceEntrySchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity:  z.number().int().min(0),
});

export const openingBalanceSchema = z.object({
  storeId: z.string().uuid(),
  entries: z.array(openingBalanceEntrySchema).min(1),
  notes:   z.string().max(1000).optional(),
});

export type AdjustStockInput     = z.infer<typeof adjustStockSchema>;
export type CreateTransferInput  = z.infer<typeof createTransferSchema>;
export type OpeningBalanceInput  = z.infer<typeof openingBalanceSchema>;
