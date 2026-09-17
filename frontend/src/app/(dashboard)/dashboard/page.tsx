'use client';

import Link from 'next/link';
import { useDashboard } from '@/hooks/use-dashboard';
import { useMe }        from '@/hooks/use-auth';

// ─── Formatters ───────────────────────────────────────────────────────────────

const currency = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : currency(n);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, trend, trendLabel, icon, color,
}: {
  label: string; value: string; sub?: string;
  trend?: number; trendLabel?: string;
  icon: string; color: 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose';
}) {
  const colors = {
    indigo: { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  ring: 'bg-indigo-100' },
    emerald:{ bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'bg-emerald-100' },
    amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'bg-amber-100' },
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'bg-blue-100' },
    rose:   { bg: 'bg-rose-50',    icon: 'text-rose-600',    ring: 'bg-rose-100' },
  }[color];

  return (
    <div className={`rounded-2xl p-5 ${colors.bg} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <div className={`h-9 w-9 rounded-xl ${colors.ring} flex items-center justify-center`}>
          <svg className={`h-5 w-5 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
          {trendLabel && <span className="text-xs text-gray-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ─── SVG bar chart (14-day trend) ────────────────────────────────────────────

function TrendChart({ data }: {
  data: Array<{ date: string; total: number; grossProfit: number }>;
}) {
  const maxVal  = Math.max(...data.map((d) => d.total), 1);
  const H = 100; const BAR = 26; const GAP = 14;
  const todayKey = new Date().toISOString().slice(0, 10);
  const DAYS = ['S','M','T','W','T','F','S'];

  return (
    <svg viewBox={`0 0 ${data.length * (BAR + GAP)} ${H + 26}`} className="w-full" style={{ maxHeight: 150 }}>
      {data.map((d, i) => {
        const x       = i * (BAR + GAP);
        const barH    = Math.max(4, (d.total / maxVal) * H);
        const profH   = d.total > 0 ? Math.max(0, (d.grossProfit / maxVal) * H) : 0;
        const isToday = d.date === todayKey;
        const dayIdx  = new Date(d.date + 'T00:00:00').getDay();
        return (
          <g key={d.date}>
            <rect x={x} y={H - barH} width={BAR} height={barH} rx={4}
              fill={isToday ? '#4f46e5' : '#e0e7ff'} />
            {profH > 0 && (
              <rect x={x} y={H - profH} width={BAR} height={profH} rx={4}
                fill={isToday ? '#10b981' : '#bbf7d0'} />
            )}
            <text x={x + BAR / 2} y={H + 16} textAnchor="middle"
              fontSize={9} fill={isToday ? '#4f46e5' : '#9ca3af'}
              fontWeight={isToday ? 700 : 400}>
              {DAYS[dayIdx]}
            </text>
            {isToday && d.total > 0 && (
              <text x={x + BAR / 2} y={H - barH - 4} textAnchor="middle"
                fontSize={8} fill="#4f46e5" fontWeight={700}>
                {compact(d.total)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Category horizontal bar ──────────────────────────────────────────────────

const BAR_COLORS = ['bg-indigo-500','bg-blue-500','bg-violet-500','bg-cyan-500','bg-fuchsia-500','bg-teal-500','bg-sky-500'];

function CategoryBar({ name, total, grossProfit, maxTotal, rank }: {
  name: string; total: number; grossProfit: number; maxTotal: number; rank: number;
}) {
  const pctW  = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const margin = total > 0 ? (grossProfit / total) * 100 : 0;
  const clr   = BAR_COLORS[rank % BAR_COLORS.length];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-700 truncate">{name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${margin >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {margin.toFixed(0)}% margin
          </span>
          <span className="text-sm font-black text-gray-900">{currency(total)}</span>
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${clr}`} style={{ width: `${pctW}%` }} />
      </div>
    </div>
  );
}

// ─── Payment mode pill ────────────────────────────────────────────────────────

const PAY_MODE_CFG: Record<string, { label: string; bar: string; bg: string }> = {
  cash:   { label: 'Cash',   bar: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bank:   { label: 'Bank',   bar: 'bg-blue-500',    bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  credit: { label: 'Credit', bar: 'bg-orange-500',  bg: 'bg-orange-50 text-orange-700 border-orange-200' },
};

function PaymentPill({ mode, total, count, grandTotal }: {
  mode: string; total: number; count: number; grandTotal: number;
}) {
  const share = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
  const cfg   = PAY_MODE_CFG[mode] ?? { label: mode, bar: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold">{cfg.label}</span>
        <span className="text-xs font-medium opacity-70">{count} txn{count !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xl font-black mb-2">{currency(total)}</p>
      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${share}%` }} />
      </div>
      <p className="text-[11px] mt-1 opacity-60">{share.toFixed(0)}% of month</p>
    </div>
  );
}

// ─── Payment status badge ─────────────────────────────────────────────────────

const PAY_STATUS_CLS: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid:  'bg-red-100 text-red-600',
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const { data: d, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (!d) return null;

  const netProfit  = (d.monthSales.grossProfit ?? 0) - (d.totalExpensesMonth ?? 0);
  const payTotal   = (d.paymentModeBreakdown ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Revenue" color="indigo"
          value={`$${compact(d.todaySales.total)}`}
          sub={`${d.todaySales.count} invoice${d.todaySales.count !== 1 ? 's' : ''}`}
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <KpiCard label="Month Revenue" color="blue"
          value={`$${compact(d.monthSales.total)}`}
          sub={`${d.monthSales.count} invoices`}
          trend={d.monthSales.vsLastMonth} trendLabel="vs last month"
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
        <KpiCard label="Gross Profit" color="emerald"
          value={`$${compact(d.monthSales.grossProfit)}`}
          sub={`${d.monthSales.margin.toFixed(1)}% margin`}
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
        <KpiCard label="Net Profit" color={netProfit >= 0 ? 'emerald' : 'rose'}
          value={`$${compact(Math.abs(netProfit))}`}
          sub={`After $${compact(d.totalExpensesMonth ?? 0)} expenses`}
          icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
        />
      </div>

      {/* ── Sales trend + Cash/Bank ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700">14-Day Sales Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Revenue vs Gross Profit</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-indigo-200 inline-block" />Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 inline-block" />Profit
              </span>
            </div>
          </div>
          {d.salesTrend && d.salesTrend.some((r) => r.total > 0) ? (
            <TrendChart data={d.salesTrend} />
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-gray-300">No confirmed sales in last 14 days</div>
          )}
        </div>

        {/* Cash & bank */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700">Cash & Bank</h3>
            <Link href="/finance/accounts" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Manage →</Link>
          </div>
          <div className="mb-4">
            <p className="text-xs text-gray-400">Total Funds</p>
            <p className="text-3xl font-black text-gray-900">${compact(d.cashBankSummary?.combined ?? 0)}</p>
          </div>
          <div className="space-y-2.5">
            {(d.cashBankSummary?.accounts ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${a.category === 'cash' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <span className="text-xs text-gray-600 truncate">{a.name}</span>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ml-2 ${a.balance < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                  ${currency(a.balance)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Cash</p>
              <p className="text-sm font-black text-emerald-600">${compact(d.cashBankSummary?.totalCash ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bank</p>
              <p className="text-sm font-black text-blue-600">${compact(d.cashBankSummary?.totalBank ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Categories + Payment modes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Categories */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1">Category Sales — This Month</h3>
          <p className="text-xs text-gray-400 mb-5">Revenue with profit margin per category</p>
          {d.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-10">No sales this month</p>
          ) : (
            <div className="space-y-4">
              {d.categoryBreakdown.map((cat, i) => (
                <CategoryBar key={cat.name} rank={i} name={cat.name}
                  total={cat.total} grossProfit={cat.grossProfit}
                  maxTotal={d.categoryBreakdown[0].total} />
              ))}
            </div>
          )}
        </div>

        {/* Payment modes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Payment Collection</h3>
          {(d.paymentModeBreakdown ?? []).length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-10">No payments this month</p>
          ) : (
            <div className="space-y-3">
              {(d.paymentModeBreakdown ?? []).map((p) => (
                <PaymentPill key={p.mode} mode={p.mode} total={p.total} count={p.count} grandTotal={payTotal} />
              ))}
            </div>
          )}
          {d.outstandingReceivables && d.outstandingReceivables.total > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Outstanding</p>
                <p className="text-lg font-black text-orange-600 mt-0.5">${currency(d.outstandingReceivables.total)}</p>
                <p className="text-xs text-orange-500 mt-0.5">
                  {d.outstandingReceivables.count} unpaid / partial invoice{d.outstandingReceivables.count !== 1 ? 's' : ''}
                </p>
                <Link href="/sales/invoices?paymentStatus=unpaid"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-800 mt-2 inline-block">
                  View all →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top products + Recent invoices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-700">Top Products — This Month</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Qty</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(d.topProducts ?? []).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-300">No sales this month</td></tr>
              ) : (
                (d.topProducts ?? []).map((p, i) => (
                  <tr key={p.name + i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-black text-gray-300">#{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-600">{p.quantity}</td>
                    <td className="px-5 py-3 text-right text-sm font-black text-gray-900">${compact(p.total)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">${compact(p.grossProfit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Recent Invoices</h3>
            <Link href="/sales/invoices" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentInvoices.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-300">No invoices yet</p>
            ) : (
              d.recentInvoices.map((inv) => (
                <Link key={inv.id} href={`/sales/invoices/${inv.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 font-mono group-hover:text-indigo-600 transition-colors">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {inv.customerName ?? 'Walk-in'} · {inv.invoiceDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAY_STATUS_CLS[inv.paymentStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {inv.paymentStatus}
                    </span>
                    <span className="text-sm font-black text-gray-900">${currency(inv.total)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────

function UserDashboard() {
  const { data: d, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (!d) return null;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Today's Sales" color="indigo"
          value={`$${compact(d.todaySales.total)}`}
          sub={`${d.todaySales.count} invoice${d.todaySales.count !== 1 ? 's' : ''}`}
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <KpiCard label="Month Sales" color="blue"
          value={`$${compact(d.monthSales.total)}`}
          sub={`${d.monthSales.count} invoices`}
          trend={d.monthSales.vsLastMonth} trendLabel="vs last month"
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
        <KpiCard label="Top Category" color="amber"
          value={d.categoryBreakdown[0]?.name ?? '—'}
          sub={d.categoryBreakdown[0] ? `$${compact(d.categoryBreakdown[0].total)}` : 'No sales yet'}
          icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-1">Category-wise Sales — This Month</h3>
        <p className="text-xs text-gray-400 mb-5">Revenue breakdown by product category</p>
        {d.categoryBreakdown.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="h-12 w-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
            </svg>
            <p className="text-sm text-gray-400">No sales recorded this month yet</p>
            <Link href="/sales/invoices/new"
              className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              Create first invoice →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {d.categoryBreakdown.map((cat, i) => (
              <CategoryBar key={cat.name} rank={i} name={cat.name}
                total={cat.total} grossProfit={cat.grossProfit}
                maxTotal={d.categoryBreakdown[0].total} />
            ))}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Recent Invoices</h3>
          <Link href="/sales/invoices" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {d.recentInvoices.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-300">No invoices yet</p>
          ) : (
            d.recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/sales/invoices/${inv.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 font-mono group-hover:text-indigo-600 transition-colors">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {inv.customerName ?? 'Walk-in'} · {inv.invoiceDate}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAY_STATUS_CLS[inv.paymentStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                    {inv.paymentStatus}
                  </span>
                  <span className="text-sm font-black text-gray-900">${currency(inv.total)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
  const now     = new Date();
  const hour    = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{greeting}{me?.name ? `, ${me.name}` : ''}</p>
          <h1 className="text-2xl font-black text-gray-900 mt-0.5">
            {isAdmin ? 'Business Overview' : 'My Dashboard'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {now.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/sales/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Sale
        </Link>
      </div>

      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}
