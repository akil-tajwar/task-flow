'use client';

import { usePathname } from 'next/navigation';
import { useOnlineStatus } from '@/hooks/use-online-status';

// Pages that work offline
const OFFLINE_PATHS = ['/sales/invoices'];

export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();

  const allowed = OFFLINE_PATHS.some((p) => pathname.startsWith(p));

  if (!isOnline && !allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M8.464 8.464a5 5 0 000 7.072M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Not available offline</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          This page requires an internet connection. Reconnect to continue,
          or go to <strong>Sales Invoices</strong> to create a sale offline.
        </p>
        <a href="/sales/invoices/new"
          className="mt-6 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
          New Offline Sale
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
