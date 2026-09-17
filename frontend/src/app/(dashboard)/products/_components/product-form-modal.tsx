'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCreateProduct, useUpdateProduct, useProduct } from '@/hooks/use-products';
import { useBrands, useCreateBrand } from '@/hooks/use-brands';
import { useCategories, useCreateCategory } from '@/hooks/use-categories';
import type { Product, ProductVariant, ProductUOM } from '@/types';

// ─── Local form types ──────────────────────────────────────────────────────────

interface VariantOptionRow { id: string; name: string; values: string }
interface VariantRow { id: string; attributes: Record<string, string>; sku: string; price: string }
interface UOMRow { id: string; name: string; abbreviation: string; conversionFactor: string; price: string; isBase: boolean }

interface FormState {
  name: string; description: string; sku: string; basePrice: string;
  imageUrl: string; brandId: string; categoryId: string; hasVariants: boolean;
  variantOptions: VariantOptionRow[]; variantRows: VariantRow[];
  enableUoms: boolean; uoms: UOMRow[];
}

const EMPTY: FormState = {
  name: '', description: '', sku: '', basePrice: '',
  imageUrl: '', brandId: '', categoryId: '', hasVariants: false,
  variantOptions: [], variantRows: [], enableUoms: false, uoms: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cartesian(options: Array<{ name: string; values: string[] }>): Record<string, string>[] {
  const valid = options.filter((o) => o.name && o.values.length);
  if (!valid.length) return [];
  return valid.reduce<Record<string, string>[]>((acc, { name, values }) => {
    if (!acc.length) return values.map((v) => ({ [name]: v }));
    return acc.flatMap((combo) => values.map((v) => ({ ...combo, [name]: v })));
  }, []);
}

function mergeVariantRows(combinations: Record<string, string>[], existing: VariantRow[]): VariantRow[] {
  return combinations.map((attrs) => {
    const key = JSON.stringify(Object.entries(attrs).sort());
    const found = existing.find((r) => JSON.stringify(Object.entries(r.attributes).sort()) === key);
    return found ? { ...found, attributes: attrs } : { id: crypto.randomUUID(), attributes: attrs, sku: '', price: '' };
  });
}

function parseVariants(variantOptions: Product['variantOptions'], variants: Product['variants']): { options: VariantOptionRow[]; rows: VariantRow[] } {
  if (!variantOptions?.length) return { options: [], rows: [] };
  return {
    options: variantOptions.map((o) => ({ id: o.id, name: o.name, values: o.values.join(', ') })),
    rows: (variants ?? []).map((v: ProductVariant) => ({
      id: v.id, attributes: v.attributes, sku: v.sku ?? '', price: v.price ?? '',
    })),
  };
}

function parseUoms(uoms: Product['uoms']): UOMRow[] {
  if (!uoms?.length) return [];
  return uoms.map((u: ProductUOM) => ({
    id: u.id, name: u.name, abbreviation: u.abbreviation,
    conversionFactor: u.conversionFactor, price: u.price ?? '', isBase: u.isBase,
  }));
}

function formFromProduct(p: Product): FormState {
  const { options, rows } = parseVariants(p.variantOptions, p.variants);
  const uomRows = parseUoms(p.uoms);
  return {
    name: p.name, description: p.description ?? '', sku: p.sku ?? '',
    basePrice: p.basePrice, imageUrl: p.imageUrl ?? '',
    brandId: p.brandId ?? '', categoryId: p.categoryId ?? '', hasVariants: p.hasVariants,
    variantOptions: options, variantRows: rows,
    enableUoms: uomRows.length > 0, uoms: uomRows,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineCreate({ label, onCreate, isPending }: { label: string; onCreate: (name: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const submit = () => { if (value.trim()) { onCreate(value.trim()); setValue(''); setOpen(false); } };
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-800 mt-1">+ Add {label}</button>;
  return (
    <div className="flex items-center gap-2 mt-1">
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())}
        placeholder={`${label} name`} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      <button type="button" onClick={submit} disabled={isPending} className="text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700 disabled:opacity-50">{isPending ? '…' : 'Save'}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`} />
        <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';
const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const cellInput = 'w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400';

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { open: boolean; product?: Product | null; onClose: () => void }

export function ProductFormModal({ open, product, onClose }: Props) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: brands = [] }     = useBrands();
  const { data: categories = [] } = useCategories();
  const createBrand    = useCreateBrand();
  const createCategory = useCreateCategory();

  const isEditing = !!product;
  // Fetch full product (with UOMs + variants) when editing
  const { data: fullProduct } = useProduct(isEditing ? product!.id : '');

  const [form, setForm]   = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  // Initialize basic fields when modal opens / product changes
  useEffect(() => {
    if (!open) return;
    setForm(product ? formFromProduct(product) : EMPTY);
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  // Once full product loads, refresh UOMs + variants without touching other fields
  useEffect(() => {
    if (!open || !fullProduct) return;
    const { options, rows } = parseVariants(fullProduct.variantOptions, fullProduct.variants);
    const uomRows = parseUoms(fullProduct.uoms);
    setForm((prev) => ({ ...prev, variantOptions: options, variantRows: rows, enableUoms: uomRows.length > 0, uoms: uomRows }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fullProduct?.id]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const updateOptions = useCallback((newOptions: VariantOptionRow[]) => {
    const parsed = newOptions.map((o) => ({ name: o.name, values: o.values.split(',').map((v) => v.trim()).filter(Boolean) }));
    setForm((prev) => ({ ...prev, variantOptions: newOptions, variantRows: mergeVariantRows(cartesian(parsed), prev.variantRows) }));
  }, []);

  const setUomBase = (idx: number) =>
    set({ uoms: form.uoms.map((u, i) => ({ ...u, isBase: i === idx })) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.basePrice || isNaN(parseFloat(form.basePrice))) { setError('A valid base price is required.'); return; }

    const payload: Record<string, unknown> = {
      name: form.name.trim(), description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined, basePrice: parseFloat(form.basePrice),
      imageUrl: form.imageUrl.trim() || undefined,
      brandId: form.brandId || undefined, categoryId: form.categoryId || undefined,
      hasVariants: form.hasVariants,
    };

    if (form.hasVariants) {
      const optsParsed = form.variantOptions.filter((o) => o.name.trim() && o.values.trim()).map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) }));
      if (optsParsed.length) {
        payload.variantOptions = optsParsed;
        payload.variants = form.variantRows.map((r) => ({ sku: r.sku.trim() || undefined, attributes: r.attributes, price: r.price ? parseFloat(r.price) : undefined }));
      }
    }

    if (form.enableUoms) {
      const validUoms = form.uoms.filter((u) => u.name.trim() && u.abbreviation.trim());
      if (validUoms.length) {
        payload.uoms = validUoms.map((u) => ({
          name: u.name.trim(), abbreviation: u.abbreviation.trim(),
          conversionFactor: parseFloat(u.conversionFactor) || 1,
          price: u.price.trim() ? parseFloat(u.price) : undefined,
          isBase: u.isBase,
        }));
      }
    } else if (isEditing) {
      // Explicitly clear UOMs on edit when toggle disabled
      payload.uoms = [];
    }

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product!.id, ...payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Product' : 'New Product'}</h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{product!.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {/* Body */}
        <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {/* Basic Info */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Product Name" required>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Classic White Sneaker" className={inputCls} required />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Short product description" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU"><input value={form.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="e.g. SNK-WHT-001" className={inputCls} /></Field>
                <Field label="Image URL"><input value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://..." className={inputCls} /></Field>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pricing</h3>
            <Field label="Base Price" required>
              <div className="relative w-48">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => set({ basePrice: e.target.value })} placeholder="0.00" className={`${inputCls} pl-7`} required />
              </div>
            </Field>
          </section>

          {/* Current Inventory (edit only, read-only) */}
          {isEditing && fullProduct && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Inventory</h3>
                <a href="/inventory" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Manage in Inventory →</a>
              </div>
              {fullProduct.hasVariants ? (
                // Variant product: show per-variant per-store breakdown
                (fullProduct.variants ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No variants defined.</p>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Variant</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Store</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase">On Hand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(fullProduct.variants ?? []).flatMap((v) =>
                          (v.inventory ?? []).length === 0 ? (
                            <tr key={v.id}>
                              <td className="px-3 py-2 text-gray-600">{Object.values(v.attributes).join(' / ')}</td>
                              <td className="px-3 py-2 text-gray-400 italic" colSpan={2}>Not in inventory</td>
                            </tr>
                          ) : (v.inventory ?? []).map((inv) => (
                            <tr key={`${v.id}-${inv.storeId}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-700">{Object.values(v.attributes).join(' / ')}</td>
                              <td className="px-3 py-2 text-gray-500">{inv.store.name} <span className="text-gray-300">({inv.store.code})</span></td>
                              <td className={`px-3 py-2 text-right font-semibold ${inv.quantity <= 0 ? 'text-red-600' : inv.quantity <= 10 ? 'text-amber-600' : 'text-green-600'}`}>{inv.quantity}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                // Non-variant product: show per-store breakdown
                (fullProduct.inventory ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-400 text-center">
                    No inventory records yet — use the Inventory module to add stock.
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Store</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase">On Hand</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase">Reserved</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase">Available</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(fullProduct.inventory ?? []).map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-700">
                              {inv.store.name}
                              {inv.store.isDefault && <span className="ml-1.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">Default</span>}
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold ${inv.quantity <= 0 ? 'text-red-600' : inv.quantity <= 10 ? 'text-amber-600' : 'text-green-600'}`}>{inv.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{inv.reservedQuantity}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${(inv.quantity - inv.reservedQuantity) <= 0 ? 'text-red-600' : 'text-gray-700'}`}>{inv.quantity - inv.reservedQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-3 py-2 text-gray-500 font-semibold">Total</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{(fullProduct.inventory ?? []).reduce((s, r) => s + r.quantity, 0)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-400">{(fullProduct.inventory ?? []).reduce((s, r) => s + r.reservedQuantity, 0)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{(fullProduct.inventory ?? []).reduce((s, r) => s + (r.quantity - r.reservedQuantity), 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </section>
          )}

          {/* Organisation */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Organisation</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Field label="Brand">
                  <select value={form.brandId} onChange={(e) => set({ brandId: e.target.value })} className={selectCls}>
                    <option value="">No brand</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <InlineCreate label="brand" isPending={createBrand.isPending} onCreate={(name) => createBrand.mutate(name, { onSuccess: (b) => set({ brandId: b.id }) })} />
              </div>
              <div>
                <Field label="Category">
                  <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={selectCls}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <InlineCreate label="category" isPending={createCategory.isPending} onCreate={(name) => createCategory.mutate({ name }, { onSuccess: (c) => set({ categoryId: c.id }) })} />
              </div>
            </div>
          </section>

          {/* UOMs */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Units of Measure (UOM)</h3>
              <Toggle checked={form.enableUoms} onChange={(v) => set({ enableUoms: v, uoms: v && form.uoms.length ? form.uoms : [] })} label="Enable UOMs" />
            </div>
            {form.enableUoms && (
              <div className="space-y-3">
                {form.uoms.length > 0 && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Name', 'Abbrev.', 'Conv. ×', 'Price $', 'Base', ''].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.uoms.map((u, idx) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <input value={u.name} onChange={(e) => set({ uoms: form.uoms.map((r, i) => i === idx ? { ...r, name: e.target.value } : r) })}
                                placeholder="e.g. Box" className={cellInput} style={{ width: 90 }} />
                            </td>
                            <td className="px-3 py-2">
                              <input value={u.abbreviation} onChange={(e) => set({ uoms: form.uoms.map((r, i) => i === idx ? { ...r, abbreviation: e.target.value } : r) })}
                                placeholder="box" className={cellInput} style={{ width: 56 }} />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0.0001" step="any" value={u.conversionFactor}
                                onChange={(e) => set({ uoms: form.uoms.map((r, i) => i === idx ? { ...r, conversionFactor: e.target.value } : r) })}
                                placeholder="1" className={cellInput} style={{ width: 60 }} />
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative" style={{ width: 72 }}>
                                <span className="absolute inset-y-0 left-2 flex items-center text-gray-400 text-xs">$</span>
                                <input type="number" min="0" step="0.01" value={u.price}
                                  onChange={(e) => set({ uoms: form.uoms.map((r, i) => i === idx ? { ...r, price: e.target.value } : r) })}
                                  placeholder="—" className={`${cellInput} pl-5`} />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="radio" name="uom-base" checked={u.isBase} onChange={() => setUomBase(idx)}
                                className="accent-indigo-600 h-4 w-4 cursor-pointer" />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => set({ uoms: form.uoms.filter((_, i) => i !== idx) })}
                                className="text-red-400 hover:text-red-600 p-0.5">
                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button type="button"
                  onClick={() => set({ uoms: [...form.uoms, { id: crypto.randomUUID(), name: '', abbreviation: '', conversionFactor: '1', price: '', isBase: form.uoms.length === 0 }] })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  + Add UOM
                </button>
                <p className="text-xs text-gray-400">Set one UOM as <strong>Base</strong> (conversion × = 1). Other UOMs specify how many base units they equal.</p>
              </div>
            )}
          </section>

          {/* Variants */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variants</h3>
              <Toggle checked={form.hasVariants} label="This product has variants"
                onChange={(v) => set({ hasVariants: v, variantOptions: v ? form.variantOptions : [], variantRows: [] })} />
            </div>
            {form.hasVariants && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {form.variantOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input value={opt.name} onChange={(e) => { const next = form.variantOptions.map((o, i) => i === idx ? { ...o, name: e.target.value } : o); updateOptions(next); }}
                        placeholder="Option name (e.g. Size)" className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input value={opt.values} onChange={(e) => { const next = form.variantOptions.map((o, i) => i === idx ? { ...o, values: e.target.value } : o); updateOptions(next); }}
                        placeholder="Values, comma-separated (e.g. S, M, L)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => updateOptions(form.variantOptions.filter((_, i) => i !== idx))} className="flex-shrink-0 text-red-400 hover:text-red-600 p-1">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateOptions([...form.variantOptions, { id: crypto.randomUUID(), name: '', values: '' }])} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add option</button>
                </div>
                {form.variantRows.length > 0 && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {form.variantOptions.map((o) => <th key={o.id} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{o.name || 'Option'}</th>)}
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Price Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.variantRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            {form.variantOptions.map((o) => <td key={o.id} className="px-3 py-2 text-gray-600">{row.attributes[o.name] ?? '—'}</td>)}
                            <td className="px-3 py-2"><input value={row.sku} onChange={(e) => set({ variantRows: form.variantRows.map((r, i) => i === idx ? { ...r, sku: e.target.value } : r) })} placeholder="SKU" className={`${cellInput} w-24`} /></td>
                            <td className="px-3 py-2"><div className="relative w-24"><span className="absolute inset-y-0 left-2 flex items-center text-gray-400 text-xs">$</span><input type="number" min="0" step="0.01" value={row.price} onChange={(e) => set({ variantRows: form.variantRows.map((r, i) => i === idx ? { ...r, price: e.target.value } : r) })} placeholder="—" className={`${cellInput} pl-5 w-full`} /></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {form.variantOptions.length > 0 && form.variantRows.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Add values to the options above to generate variant rows.</p>
                )}
              </div>
            )}
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button form="product-form" type="submit" disabled={isPending} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>
    </>
  );
}
