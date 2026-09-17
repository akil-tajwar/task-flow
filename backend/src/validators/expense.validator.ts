import { z } from 'zod';

export const createExpenseHeadSchema = z.object({
  name:        z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
});

export const updateExpenseHeadSchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive:    z.boolean().optional(),
});

export const createExpenseSchema = z.object({
  expenseHeadId:   z.string().uuid(),
  accountId:       z.string().uuid(),
  amount:          z.number().positive(),
  expenseDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes:           z.string().max(1000).optional().nullable(),
});

export type CreateExpenseHeadInput = z.infer<typeof createExpenseHeadSchema>;
export type UpdateExpenseHeadInput = z.infer<typeof updateExpenseHeadSchema>;
export type CreateExpenseInput     = z.infer<typeof createExpenseSchema>;
