import { z } from 'zod';

export const createStoreSchema = z.object({
  name:      z.string().min(1).max(255),
  code:      z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, hyphens or underscores'),
  address:   z.string().max(1000).optional(),
  city:      z.string().max(100).optional(),
  country:   z.string().max(100).optional(),
  phone:     z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
