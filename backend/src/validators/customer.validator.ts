import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    loyaltyPoints: z.number().int().min(0).optional(),
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
