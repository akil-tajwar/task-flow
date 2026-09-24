import { SidebarNav }             from './_components/sidebar-nav';
import { UserMenu }               from './_components/user-menu';
import { OfflineBanner }          from './_components/offline-banner';
import { OfflineGuard }           from './_components/offline-guard';
import { DataSnapshotProvider }   from './_components/data-snapshot-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataSnapshotProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-gray-900 flex flex-col flex-shrink-0">
          <div className="px-4 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">TaskFlow</span>
            </div>
          </div>
          <SidebarNav />
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">

          {/* Offline banner (above topbar) */}
          <OfflineBanner />

          {/* Topbar */}
          <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 flex-shrink-0 sticky top-0 z-30">
            <UserMenu />
          </header>

          {/* Page content */}
          <main className="flex-1 bg-gray-50 p-8 overflow-auto">
            <OfflineGuard>
              {children}
            </OfflineGuard>
          </main>
        </div>
      </div>
    </DataSnapshotProvider>
  );
}
