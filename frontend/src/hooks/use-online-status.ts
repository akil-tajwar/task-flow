'use client';

import { useEffect, useState } from 'react';
import { getBackendReachable, subscribeBackendReachable } from '@/lib/connectivity';

// Returns true only when BOTH the device has network AND the backend is reachable.
// This correctly handles the case where the device is online but the backend server is down.
export function useOnlineStatus(): boolean {
  const [navOnline, setNavOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [backendReachable, setBackendReachable] = useState(getBackendReachable);

  useEffect(() => {
    const onOnline  = () => setNavOnline(true);
    const onOffline = () => setNavOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    const unsub = subscribeBackendReachable(setBackendReachable);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      unsub();
    };
  }, []);

  return navOnline && backendReachable;
}
