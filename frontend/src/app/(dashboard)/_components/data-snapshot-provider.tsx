'use client';

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { subscribeBackendReachable } from '@/lib/connectivity';
import { refreshOfflineSnapshot } from '@/lib/data-snapshot';
import { getMeta } from '@/lib/offline-db';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function DataSnapshotProvider({ children }: { children: React.ReactNode }) {
  const isOnline    = useOnlineStatus();
  const refreshedAt = useRef<number>(0);

  function maybeRefresh() {
    const shouldRefresh = Date.now() - refreshedAt.current > REFRESH_INTERVAL_MS;
    if (!shouldRefresh) return;
    getMeta<string>('lastSync').then((last) => {
      const stale = !last || Date.now() - new Date(last).getTime() > REFRESH_INTERVAL_MS;
      if (stale) {
        refreshedAt.current = Date.now();
        refreshOfflineSnapshot();
      }
    });
  }

  // Refresh when isOnline changes to true
  useEffect(() => {
    if (isOnline) maybeRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Also refresh when backend becomes reachable (covers server-restart scenario)
  useEffect(() => {
    const unsub = subscribeBackendReachable((reachable) => {
      if (reachable) {
        refreshedAt.current = 0; // force refresh
        refreshOfflineSnapshot();
      }
    });
    // Initial snapshot on mount
    refreshedAt.current = Date.now();
    refreshOfflineSnapshot();
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
