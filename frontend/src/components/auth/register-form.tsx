'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/hooks/use-auth';

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const [form, setForm] = useState({
    name: '',
    tenantName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const slug = toSlug(form.tenantName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!slug) {
      setError('Business name is required');
      return;
    }

    try {
      await register.mutateAsync({
        name: form.name,
        tenantName: form.tenantName,
        email: form.email,
        password: form.password,
        tenantSlug: slug,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed';
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="John Doe"
            required
            minLength={2}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
          <input
            type="text"
            value={form.tenantName}
            onChange={set('tenantName')}
            placeholder="My Store"
            required
            minLength={2}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
          {slug && (
            <p className="mt-1 text-xs text-gray-400">
              ID: <span className="font-mono text-gray-600">{slug}</span>
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="you@company.com"
          required
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Min 8 characters"
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="••••••••"
            required
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={register.isPending}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {register.isPending ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-xs text-gray-400">
        By creating an account you agree to our Terms of Service.
      </p>
    </form>
  );
}
