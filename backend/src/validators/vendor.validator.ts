import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  contactPerson: z.string().max(255).optional(),
  taxId: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const updateVendorSchema = createVendorSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
