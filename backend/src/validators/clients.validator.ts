import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema
  .omit({ password: true })
  .partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
