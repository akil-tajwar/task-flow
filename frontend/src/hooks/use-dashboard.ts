'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardData {
  todaySales:        { count: number; total: number; grossProfit: number };
  monthSales:        { count: number; total: number; grossProfit: number; margin: number; vsLastMonth: number };
  categoryBreakdown: Array<{ name: string; total: number; grossProfit: number; quantity: number; count: number }>;
  recentInvoices:    Array<{ id: string; invoiceNumber: string; invoiceDate: string; customerName: string | null; total: number; status: string; paymentStatus: string }>;
  cashBankSummary?:        { totalCash: number; totalBank: number; combined: number; accounts: Array<{ id: string; name: string; category: string; balance: number }> };
  salesTrend?:             Array<{ date: string; total: number; grossProfit: number; count: number }>;
  topProducts?:            Array<{ name: string; sku: string; quantity: number; total: number; grossProfit: number }>;
  paymentModeBreakdown?:   Array<{ mode: string; count: number; total: number }>;
  outstandingReceivables?: { count: number; total: number };
  totalExpensesMonth?:     number;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data;
    },
    staleTime: 60_000, // refetch after 1 min
  });
}
