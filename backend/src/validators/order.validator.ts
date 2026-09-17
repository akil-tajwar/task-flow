import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
