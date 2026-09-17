'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe, useLogout } from '@/hooks/use-auth';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function avatarBg(name?: string | null) {
  const palette = [
    'bg-indigo-600', 'bg-emerald-600', 'bg-violet-600',
    'bg-rose-600',   'bg-amber-600',   'bg-sky-600',
  ];
  if (!name) return palette[0];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

const ROLE_CHIP: Record<string, string> = {
  super_admin: 'bg-rose-100 text-rose-700',
  admin:       'bg-indigo-100 text-indigo-700',
  user:        'bg-gray-100 text-gray-600',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  user:        'User',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UserMenu() {
  const { data: me }     = useMe();
  const logout           = useLogout();
  const router           = useRouter();
  const [open, setOpen]  = useState(false);
  const menuRef          = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logout.mutateAsync();
    } finally {
      // Always clear tokens and redirect, even if the API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.replace('/');
    }
  }

  if (!me) return null;

  const initials  = getInitials(me.name);
  const bg        = avatarBg(me.name);
  const roleChip  = ROLE_CHIP[me.role]  ?? ROLE_CHIP.user;
  const roleLabel = ROLE_LABEL[me.role] ?? 'User';

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white
          ring-2 ring-transparent hover:ring-indigo-400 focus:outline-none focus:ring-indigo-400
          transition-all ${bg}`}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200
            origin-top-right animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* User info */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0 ${bg}`}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{me.name}</p>
                <p className="text-xs text-gray-400 truncate">{me.email}</p>
                <span className={`mt-1.5 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleChip}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Actions */}
          <div className="py-1.5">
            <button
              role="menuitem"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600
                hover:bg-red-50 active:bg-red-100 transition-colors rounded-lg mx-1 w-[calc(100%-8px)]
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
