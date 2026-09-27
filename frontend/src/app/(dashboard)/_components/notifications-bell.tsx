'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import { Notification } from '@/types/notifications';


// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TYPE_DOT: Record<string, string> = {
  'task completed': 'bg-emerald-500',
  'task blocked': 'bg-red-500',
};

function typeDot(type: string) {
  return TYPE_DOT[type] ?? 'bg-indigo-500';
}

// linkUrl from the backend is a full absolute URL
// (`${FRONTEND_URL}/tasks/${id}`) — pull out just the path so router.push
// does a normal client-side navigation instead of a full page reload.
function pathFromLinkUrl(linkUrl?: string | null): string | null {
  if (!linkUrl) return null;
  try {
    return new URL(linkUrl).pathname;
  } catch {
    // Already a relative path, or malformed — use as-is.
    return linkUrl;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: result, isLoading } = useNotifications({ limit: 20 }, open);
  const notifications = result?.data ?? [];

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClickNotification = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const path = pathFromLinkUrl(n.linkUrl);
    setOpen(false);
    if (path) router.push(path);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative h-9 w-9 rounded-full flex items-center justify-center text-gray-500
          hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400
          transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200
            origin-top-right animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {markAllRead.isPending ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  role="menuitem"
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0
                    hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                >
                  <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!n.isRead ? typeDot(n.type) : 'bg-gray-200'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}