'use client';

import Link from 'next/link';
import { useOnlineStatus }  from '@/hooks/use-online-status';
import { useOfflineSync }   from '@/hooks/use-offline-sync';

export function OfflineBanner() {
  const isOnline                              = useOnlineStatus();
  const { syncing, pendingCount, lastResults, clearResults } = useOfflineSync();

  // ── Sync results toast ────────────────────────────────────────────────────────
  if (lastResults.length > 0) {
    const ok   = lastResults.filter((r) => r.success).length;
    const fail = lastResults.filter((r) => !r.success).length;
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          {ok > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {ok} sale{ok !== 1 ? 's' : ''} synced
            </span>
          )}
          {fail > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {fail} failed —{' '}
              <Link href="/sales/sync-log" className="underline underline-offset-2 hover:text-red-800">
                view sync log
              </Link>
            </span>
          )}
          {fail > 0 && (
            <span className="text-xs text-red-500">
              {lastResults.filter((r) => !r.success).map((r) => r.localDisplayId).join(', ')}
            </span>
          )}
        </div>
        <button onClick={clearResults} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
          Dismiss
        </button>
      </div>
    );
  }

  // ── Syncing in progress ───────────────────────────────────────────────────────
  if (syncing) {
    return (
      <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center gap-3 text-sm font-medium">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Syncing offline sales…
      </div>
    );
  }

  // ── Offline with pending ──────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center gap-3 text-sm font-semibold">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M8.464 8.464a5 5 0 000 7.072M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
        </svg>
        You are offline — only Sales Invoicing is available
        {pendingCount > 0 && (
          <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {pendingCount} queued
          </span>
        )}
      </div>
    );
  }

  // ── Online with pending ───────────────────────────────────────────────────────
  if (pendingCount > 0) {
    return (
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-3 text-sm text-indigo-700 font-medium">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {pendingCount} offline sale{pendingCount !== 1 ? 's' : ''} pending sync…
      </div>
    );
  }

  return null;
}
