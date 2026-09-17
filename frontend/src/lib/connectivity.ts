// Singleton that tracks whether the backend API is actually reachable.
// Separate from navigator.onLine which only reflects device network state.

let _reachable = true;
let _pollTimer: ReturnType<typeof setTimeout> | null = null;
const _listeners = new Set<(v: boolean) => void>();

export function getBackendReachable(): boolean {
  return _reachable;
}

export function subscribeBackendReachable(fn: (v: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function setBackendReachable(v: boolean): void {
  if (v === _reachable) return;
  _reachable = v;
  _listeners.forEach((fn) => fn(v));

  if (!v) {
    // Backend went offline — start polling until it's back
    startPolling();
  } else {
    stopPolling();
  }
}

// ─── Periodic ping to detect recovery ────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const PING_URL = `${API_BASE}/health`;
const POLL_MS  = 10_000;

async function ping(): Promise<void> {
  try {
    const res = await fetch(PING_URL, { method: 'HEAD', cache: 'no-store' });
    if (res.ok || res.status < 500) setBackendReachable(true);
  } catch {
    // still unreachable — keep polling
  }
}

function startPolling(): void {
  if (_pollTimer) return;
  _pollTimer = setInterval(ping, POLL_MS);
}

function stopPolling(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}
