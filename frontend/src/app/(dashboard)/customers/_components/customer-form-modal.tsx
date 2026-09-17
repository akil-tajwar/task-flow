'use client';

import { useState, useEffect } from 'react';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers';
import type { Customer } from '@/types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  notes: string;
  loyaltyPoints: string;
}

const EMPTY: FormState = {
  name: '', email: '', phone: '', address: '',
  city: '', country: '', taxId: '', notes: '', loyaltyPoints: '0',
};

function customerToForm(c: Customer): FormState {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    country: c.country ?? '',
    taxId: c.taxId ?? '',
    notes: c.notes ?? '',
    loyaltyPoints: String(c.loyaltyPoints),
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
  customer?: Customer | null;
  onClose: () => void;
  isAdmin?: boolean;
}

export function CustomerFormModal({ open, customer, onClose, isAdmin }: Props) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(customer ? customerToForm(customer) : EMPTY);
    setError('');
  }, [open, customer]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!customer;
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Customer name is required.'); return; }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (isAdmin && isEditing) {
      payload.loyaltyPoints = parseInt(form.loyaltyPoints, 10) || 0;
    }

    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
      } else {
        await createCustomer.mutateAsync(payload);
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
              {isEditing ? 'Edit Customer' : 'New Customer'}
            </h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{customer.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Full Name" required>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Jane Doe" className={inputCls} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })}
                    placeholder="jane@example.com" className={inputCls} />
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
              <Field label="Tax ID">
                <input value={form.taxId} onChange={(e) => set({ taxId: e.target.value })}
                  placeholder="e.g. US123456789" className={inputCls} />
              </Field>

              {/* Loyalty points only editable by admin when editing */}
              {isAdmin && isEditing && (
                <Field label="Loyalty Points">
                  <input type="number" min="0" step="1" value={form.loyaltyPoints}
                    onChange={(e) => set({ loyaltyPoints: e.target.value })}
                    className={inputCls} />
                </Field>
              )}

              {/* Read-only loyalty points display when creating or non-admin editing */}
              {!isAdmin && isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Points</label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {customer?.loyaltyPoints ?? 0} pts
                    </span>
                  </div>
                </div>
              )}

              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                  rows={3} placeholder="Internal notes about this customer…" className={inputCls} />
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
          <button form="customer-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create customer'}
          </button>
        </div>
      </div>
    </>
  );
}
