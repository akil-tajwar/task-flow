'use client';

import { useState, useEffect } from 'react';
import { useCreateVendor, useUpdateVendor } from '@/hooks/use-vendors';
import type { Vendor } from '@/types';

interface FormState {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '', contactPerson: '', email: '', phone: '',
  address: '', city: '', country: '', taxId: '', notes: '',
};

function vendorToForm(v: Vendor): FormState {
  return {
    name: v.name,
    contactPerson: v.contactPerson ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    address: v.address ?? '',
    city: v.city ?? '',
    country: v.country ?? '',
    taxId: v.taxId ?? '',
    notes: v.notes ?? '',
  };
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

interface Props {
  open: boolean;
  vendor?: Vendor | null;
  onClose: () => void;
}

export function VendorFormModal({ open, vendor, onClose }: Props) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(vendor ? vendorToForm(vendor) : EMPTY);
    setError('');
  }, [open, vendor]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!vendor;
  const isPending = createVendor.isPending || updateVendor.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Vendor name is required.'); return; }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateVendor.mutateAsync({ id: vendor.id, ...payload });
      } else {
        await createVendor.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Vendor' : 'New Vendor'}
            </h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{vendor.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="vendor-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Vendor / Company Name" required>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Acme Supplies Ltd." className={inputCls} required />
              </Field>
              <Field label="Contact Person">
                <input value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })}
                  placeholder="e.g. John Smith" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })}
                    placeholder="vendor@example.com" className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => set({ phone: e.target.value })}
                    placeholder="+1 555 000 0000" className={inputCls} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
            <div className="space-y-3">
              <Field label="Street Address">
                <input value={form.address} onChange={(e) => set({ address: e.target.value })}
                  placeholder="123 Main St" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input value={form.city} onChange={(e) => set({ city: e.target.value })}
                    placeholder="New York" className={inputCls} />
                </Field>
                <Field label="Country">
                  <input value={form.country} onChange={(e) => set({ country: e.target.value })}
                    placeholder="United States" className={inputCls} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional</h3>
            <div className="space-y-3">
              <Field label="Tax ID / VAT Number">
                <input value={form.taxId} onChange={(e) => set({ taxId: e.target.value })}
                  placeholder="e.g. US123456789" className={inputCls} />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                  rows={3} placeholder="Internal notes about this vendor…" className={inputCls} />
              </Field>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button form="vendor-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create vendor'}
          </button>
        </div>
      </div>
    </>
  );
}
