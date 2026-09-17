import type { Context } from 'hono';
import { productService } from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

export const productController = {
  async list(c: Context) {
    const { page, limit, search, brandId, categoryId } = c.req.query();
    return c.json(
      await productService.list(c.get('tenantId'), {
        page:       page       ? parseInt(page,  10) : undefined,
        limit:      limit      ? parseInt(limit, 10) : undefined,
        search:     search     || undefined,
        brandId:    brandId    || undefined,
        categoryId: categoryId || undefined,
      }),
    );
  },

  async get(c: Context) {
    const product = await productService.get(c.get('tenantId'), c.req.param('id')!);
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json(product);
  },

  async create(c: Context) {
    const input = createProductSchema.parse(await c.req.json());
    return c.json(await productService.create(c.get('tenantId'), input), 201);
  },

  async update(c: Context) {
    const input = updateProductSchema.parse(await c.req.json());
    const product = await productService.update(c.get('tenantId'), c.req.param('id')!, input);
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json(product);
  },

  async delete(c: Context) {
    await productService.delete(c.get('tenantId'), c.req.param('id')!);
    return c.json({ message: 'Deleted' });
  },
};
