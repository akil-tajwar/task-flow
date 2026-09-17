import { z } from 'zod';

const uomSchema = z.object({
  name:             z.string().min(1).max(100),
  abbreviation:     z.string().min(1).max(20),
  conversionFactor: z.number().positive().default(1),
  price:            z.number().positive().optional(),
  isBase:           z.boolean().default(false),
});

const variantOptionSchema = z.object({
  name:      z.string().min(1).max(100),
  values:    z.array(z.string().min(1)).min(1),
  sortOrder: z.number().int().min(0).default(0),
});

const variantSchema = z.object({
  sku:        z.string().max(100).optional(),
  attributes: z.record(z.string()),
  price:      z.number().positive().optional(),
  imageUrl:   z.string().url().optional(),
});

export const createProductSchema = z
  .object({
    name:           z.string().min(1).max(255),
    description:    z.string().optional(),
    sku:            z.string().max(100).optional(),
    basePrice:      z.number().positive(),
    imageUrl:       z.string().url().optional(),
    brandId:        z.string().uuid().optional(),
    categoryId:     z.string().uuid().optional(),
    uoms:           z.array(uomSchema).optional(),
    variantOptions: z.array(variantOptionSchema).optional(),
    variants:       z.array(variantSchema).optional(),
  })
  .refine(
    (d) => {
      if (d.variantOptions?.length || d.variants?.length) {
        return d.variantOptions?.length && d.variants?.length;
      }
      return true;
    },
    { message: 'variantOptions and variants must both be provided together' },
  );

export const updateProductSchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sku:         z.string().max(100).optional(),
  basePrice:   z.number().positive().optional(),
  imageUrl:    z.string().url().optional(),
  brandId:     z.string().uuid().nullable().optional(),
  categoryId:  z.string().uuid().nullable().optional(),
  isActive:    z.boolean().optional(),
  // Providing uoms replaces all existing UOMs for this product
  uoms:        z.array(uomSchema).optional(),
});

export type CreateProductInput    = z.infer<typeof createProductSchema>;
export type UpdateProductInput    = z.infer<typeof updateProductSchema>;
export type UomInput              = z.infer<typeof uomSchema>;
export type VariantOptionInput    = z.infer<typeof variantOptionSchema>;
export type VariantInput          = z.infer<typeof variantSchema>;
