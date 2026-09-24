'use client';

import { useState, useEffect } from 'react';
import { useCreateClient, useUpdateClient } from '@/hooks/use-clients';
import type { Client } from '@/types/client';

interface FormState {
  name: string;
  email: string;
  password: string;
  industry: string;
  website: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '', email: '', password: '', industry: '', website: '', phone: '',
  street: '', city: '', state: '', country: '', postalCode: '', notes: '',
};

function clientToForm(c: Client): FormState {
  return {
    name: c.name,
    email: c.email,
    password: '',
    industry: c.industry ?? '',
    website: c.website ?? '',
    phone: c.phone ?? '',
    street: c.street ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    country: c.country ?? '',
    postalCode: c.postalCode ?? '',
    notes: c.notes ?? '',
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
  client?: Client | null;
  onClose: () => void;
}

export function ClientFormModal({ open, client, onClose }: Props) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(client ? clientToForm(client) : EMPTY);
    setError('');
  }, [open, client]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!client;
  const isPending = createClient.isPending || updateClient.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Client name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!isEditing && form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    const base = {
      name: form.name.trim(),
      email: form.email.trim(),
      industry: form.industry.trim() || undefined,
      website: form.website.trim() || undefined,
      phone: form.phone.trim() || undefined,
      street: form.street.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateClient.mutateAsync({ id: client.id, ...base });
      } else {
        await createClient.mutateAsync({ ...base, password: form.password });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Centered modal box */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Client' : 'New Client'}
            </h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form id="client-form" onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Chrome autofill trap */}
          <input type="text" name="fake-username" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} aria-hidden="true" />
          <input type="password" name="fake-password" style={{ display: 'none' }} autoComplete="new-password" tabIndex={-1} aria-hidden="true" />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Client Name" required>
                <input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className={inputCls}
                  name="client_name"
                  autoComplete="off"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" required>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    placeholder="client@example.com"
                    className={inputCls}
                    name="client_email_field"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    placeholder="+1 555 000 0000"
                    className={inputCls}
                    name="client_phone"
                    autoComplete="off"
                  />
                </Field>
              </div>
              {!isEditing && (
                <Field label="Password" required>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set({ password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className={inputCls}
                    name="client_new_password_field"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Industry">
                  <input
                    value={form.industry}
                    onChange={(e) => set({ industry: e.target.value })}
                    placeholder="e.g. Retail"
                    className={inputCls}
                    name="client_industry"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Website">
                  <input
                    value={form.website}
                    onChange={(e) => set({ website: e.target.value })}
                    placeholder="https://example.com"
                    className={inputCls}
                    name="client_website"
                    autoComplete="off"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
            <div className="space-y-3">
              <Field label="Street Address">
                <input
                  value={form.street}
                  onChange={(e) => set({ street: e.target.value })}
                  placeholder="123 Main St"
                  className={inputCls}
                  name="client_street"
                  autoComplete="off"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => set({ city: e.target.value })}
                    placeholder="New York"
                    className={inputCls}
                    name="client_city"
                    autoComplete="off"
                  />
                </Field>
                <Field label="State">
                  <input
                    value={form.state}
                    onChange={(e) => set({ state: e.target.value })}
                    placeholder="NY"
                    className={inputCls}
                    name="client_state"
                    autoComplete="off"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <input
                    value={form.country}
                    onChange={(e) => set({ country: e.target.value })}
                    placeholder="United States"
                    className={inputCls}
                    name="client_country"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Postal Code">
                  <input
                    value={form.postalCode}
                    onChange={(e) => set({ postalCode: e.target.value })}
                    placeholder="10001"
                    className={inputCls}
                    name="client_postal_code"
                    autoComplete="off"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional</h3>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                rows={3}
                placeholder="Internal notes about this client…"
                className={inputCls}
                name="client_notes"
                autoComplete="off"
              />
            </Field>
          </section>
        </form>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button form="client-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </div>
    </div>
  );
}


// 'use client';

// import { useState, useEffect } from 'react';
// import { useCreateClient, useUpdateClient } from '@/hooks/use-clients';
// import type { Client } from '@/types/client';

// interface FormState {
//   name: string;
//   email: string;
//   password: string;
//   industry: string;
//   website: string;
//   phone: string;
//   street: string;
//   city: string;
//   state: string;
//   country: string;
//   postalCode: string;
//   notes: string;
// }

// const EMPTY: FormState = {
//   name: '', email: '', password: '', industry: '', website: '', phone: '',
//   street: '', city: '', state: '', country: '', postalCode: '', notes: '',
// };

// function clientToForm(c: Client): FormState {
//   return {
//     name: c.name,
//     email: c.email,
//     password: '',
//     industry: c.industry ?? '',
//     website: c.website ?? '',
//     phone: c.phone ?? '',
//     street: c.street ?? '',
//     city: c.city ?? '',
//     state: c.state ?? '',
//     country: c.country ?? '',
//     postalCode: c.postalCode ?? '',
//     notes: c.notes ?? '',
//   };
// }

// const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';

// function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1">
//         {label}{required && <span className="text-red-500 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// interface Props {
//   open: boolean;
//   client?: Client | null;
//   onClose: () => void;
// }

// export function ClientFormModal({ open, client, onClose }: Props) {
//   const createClient = useCreateClient();
//   const updateClient = useUpdateClient();
//   const [form, setForm] = useState<FormState>(EMPTY);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!open) return;
//     setForm(client ? clientToForm(client) : EMPTY);
//     setError('');
//   }, [open, client]);

//   const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
//   const isEditing = !!client;
//   const isPending = createClient.isPending || updateClient.isPending;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     if (!form.name.trim()) { setError('Client name is required.'); return; }
//     if (!form.email.trim()) { setError('Email is required.'); return; }
//     if (!isEditing && form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

//     const base = {
//       name: form.name.trim(),
//       email: form.email.trim(),
//       industry: form.industry.trim() || undefined,
//       website: form.website.trim() || undefined,
//       phone: form.phone.trim() || undefined,
//       street: form.street.trim() || undefined,
//       city: form.city.trim() || undefined,
//       state: form.state.trim() || undefined,
//       country: form.country.trim() || undefined,
//       postalCode: form.postalCode.trim() || undefined,
//       notes: form.notes.trim() || undefined,
//     };

//     try {
//       if (isEditing) {
//         await updateClient.mutateAsync({ id: client.id, ...base });
//       } else {
//         await createClient.mutateAsync({ ...base, password: form.password });
//       }
//       onClose();
//     } catch (err: unknown) {
//       const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
//         ?? (err instanceof Error ? err.message : 'Something went wrong.');
//       setError(msg);
//     }
//   };

//   if (!open) return null;

//   return (
//     <>
//       <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
//       <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
//         <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
//           <div>
//             <h2 className="text-lg font-semibold text-gray-900">
//               {isEditing ? 'Edit Client' : 'New Client'}
//             </h2>
//             {isEditing && <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>}
//           </div>
//           <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
//             <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//           </button>
//         </div>

//         <form id="client-form" onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
//           {/* Chrome autofill trap — keeps saved credentials from landing in the real fields below */}
//           <input type="text" name="fake-username" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} aria-hidden="true" />
//           <input type="password" name="fake-password" style={{ display: 'none' }} autoComplete="new-password" tabIndex={-1} aria-hidden="true" />

//           {error && (
//             <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
//           )}

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
//             <div className="space-y-3">
//               <Field label="Client Name" required>
//                 <input
//                   value={form.name}
//                   onChange={(e) => set({ name: e.target.value })}
//                   placeholder="e.g. Acme Corp"
//                   className={inputCls}
//                   name="client_name"
//                   autoComplete="off"
//                   required
//                 />
//               </Field>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Email" required>
//                   <input
//                     type="email"
//                     value={form.email}
//                     onChange={(e) => set({ email: e.target.value })}
//                     placeholder="client@example.com"
//                     className={inputCls}
//                     name="client_email_field"
//                     autoComplete="off"
//                     required
//                   />
//                 </Field>
//                 <Field label="Phone">
//                   <input
//                     value={form.phone}
//                     onChange={(e) => set({ phone: e.target.value })}
//                     placeholder="+1 555 000 0000"
//                     className={inputCls}
//                     name="client_phone"
//                     autoComplete="off"
//                   />
//                 </Field>
//               </div>
//               {!isEditing && (
//                 <Field label="Password" required>
//                   <input
//                     type="password"
//                     value={form.password}
//                     onChange={(e) => set({ password: e.target.value })}
//                     placeholder="Min. 8 characters"
//                     className={inputCls}
//                     name="client_new_password_field"
//                     autoComplete="new-password"
//                     required
//                     minLength={8}
//                   />
//                 </Field>
//               )}
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Industry">
//                   <input
//                     value={form.industry}
//                     onChange={(e) => set({ industry: e.target.value })}
//                     placeholder="e.g. Retail"
//                     className={inputCls}
//                     name="client_industry"
//                     autoComplete="off"
//                   />
//                 </Field>
//                 <Field label="Website">
//                   <input
//                     value={form.website}
//                     onChange={(e) => set({ website: e.target.value })}
//                     placeholder="https://example.com"
//                     className={inputCls}
//                     name="client_website"
//                     autoComplete="off"
//                   />
//                 </Field>
//               </div>
//             </div>
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
//             <div className="space-y-3">
//               <Field label="Street Address">
//                 <input
//                   value={form.street}
//                   onChange={(e) => set({ street: e.target.value })}
//                   placeholder="123 Main St"
//                   className={inputCls}
//                   name="client_street"
//                   autoComplete="off"
//                 />
//               </Field>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="City">
//                   <input
//                     value={form.city}
//                     onChange={(e) => set({ city: e.target.value })}
//                     placeholder="New York"
//                     className={inputCls}
//                     name="client_city"
//                     autoComplete="off"
//                   />
//                 </Field>
//                 <Field label="State">
//                   <input
//                     value={form.state}
//                     onChange={(e) => set({ state: e.target.value })}
//                     placeholder="NY"
//                     className={inputCls}
//                     name="client_state"
//                     autoComplete="off"
//                   />
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Country">
//                   <input
//                     value={form.country}
//                     onChange={(e) => set({ country: e.target.value })}
//                     placeholder="United States"
//                     className={inputCls}
//                     name="client_country"
//                     autoComplete="off"
//                   />
//                 </Field>
//                 <Field label="Postal Code">
//                   <input
//                     value={form.postalCode}
//                     onChange={(e) => set({ postalCode: e.target.value })}
//                     placeholder="10001"
//                     className={inputCls}
//                     name="client_postal_code"
//                     autoComplete="off"
//                   />
//                 </Field>
//               </div>
//             </div>
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional</h3>
//             <Field label="Notes">
//               <textarea
//                 value={form.notes}
//                 onChange={(e) => set({ notes: e.target.value })}
//                 rows={3}
//                 placeholder="Internal notes about this client…"
//                 className={inputCls}
//                 name="client_notes"
//                 autoComplete="off"
//               />
//             </Field>
//           </section>
//         </form>

//         <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
//           <button type="button" onClick={onClose}
//             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
//             Cancel
//           </button>
//           <button form="client-form" type="submit" disabled={isPending}
//             className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
//             {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create client'}
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }