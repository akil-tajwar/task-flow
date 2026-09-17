'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { drainSalesQueue, type SyncResult } from '@/lib/offline-sync';
import { getPendingSales } from '@/lib/offline-db';
import { getBackendReachable, subscribeBackendReachable } from '@/lib/connectivity';

export function useOfflineSync() {
  const qc          = useQueryClient();
  const runningRef  = useRef(false);
  const [syncing,      setSyncing]      = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResults,  setLastResults]  = useState<SyncResult[]>([]);

  const refreshCount = useCallback(async () => {
    const pending = await getPendingSales();
    setPendingCount(pending.length);
  }, []);

  const sync = useCallback(async () => {
    if (runningRef.current || !navigator.onLine || !getBackendReachable()) return;
    runningRef.current = true;
    setSyncing(true);
    try {
      const results = await drainSalesQueue();
      if (results.length > 0) {
        setLastResults(results);
        qc.invalidateQueries({ queryKey: ['sales-invoices'] });
        qc.invalidateQueries({ queryKey: ['finance-accounts'] });
        qc.invalidateQueries({ queryKey: ['account-ledger'] });
        qc.invalidateQueries({ queryKey: ['inventory'] });
      }
    } finally {
      runningRef.current = false;
      setSyncing(false);
      await refreshCount();
    }
  }, [qc, refreshCount]);

  useEffect(() => {
    refreshCount();

    // Sync when device network comes back
    const onOnline = () => sync();
    window.addEventListener('online', onOnline);

    // Sync when backend becomes reachable again (e.g. server restarted)
    const unsubBackend = subscribeBackendReachable((reachable) => {
      if (reachable) sync();
    });

    // Listen for service-worker background-sync trigger
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_SALES') sync();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      unsubBackend();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSWMessage);
      }
    };
  }, [sync, refreshCount]);

  return {
    syncing,
    pendingCount,
    lastResults,
    sync,
    clearResults: () => setLastResults([]),
  };
}
