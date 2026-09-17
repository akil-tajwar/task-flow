'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FinancialAccount, AccountTransaction, AccountLedger, FundTransfer, PaginatedResult } from '@/types';

export function useAccounts() {
  return useQuery<FinancialAccount[]>({
    queryKey: ['finance-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/finance');
      return data;
    },
  });
}

export function useAccount(id: string | null) {
  return useQuery<FinancialAccount>({
    queryKey: ['finance-account', id],
    queryFn: async () => {
      const { data } = await api.get(`/finance/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string; accountType: string; name: string;
      storeId?: string | null; bankName?: string | null;
      accountNumber?: string | null; ifscCode?: string | null;
      branchName?: string | null; openingBalance?: number;
      isDefault?: boolean; notes?: string | null;
    }) => {
      const { data } = await api.post('/finance', input);
      return data as FinancialAccount;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string; name?: string; storeId?: string | null;
      bankName?: string | null; accountNumber?: string | null;
      ifscCode?: string | null; branchName?: string | null;
      isDefault?: boolean; isActive?: boolean; notes?: string | null;
    }) => {
      const { data } = await api.put(`/finance/${id}`, input);
      return data as FinancialAccount;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-account', vars.id] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-accounts'] }),
  });
}

export function useSetOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, openingBalance, notes }: {
      id: string; openingBalance: number; notes?: string;
    }) => {
      const { data } = await api.patch(`/finance/${id}/opening-balance`, { openingBalance, notes });
      return data as FinancialAccount;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-account', vars.id] });
    },
  });
}

export function useAccountTransactions(accountId: string | null, page = 1) {
  return useQuery<PaginatedResult<AccountTransaction>>({
    queryKey: ['finance-transactions', accountId, page],
    queryFn: async () => {
      const { data } = await api.get(`/finance/${accountId}/transactions`, { params: { page, limit: 30 } });
      return data;
    },
    enabled: !!accountId,
  });
}

export function useAccountLedger(accountId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery<AccountLedger>({
    queryKey: ['account-ledger', accountId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const { data } = await api.get(`/finance/${accountId}/ledger`, { params });
      return data;
    },
    enabled: !!accountId,
  });
}

export function useTransfers(page = 1) {
  return useQuery<PaginatedResult<FundTransfer>>({
    queryKey: ['finance-transfers', page],
    queryFn: async () => {
      const { data } = await api.get('/finance/transfers', { params: { page, limit: 30 } });
      return data;
    },
  });
}

export interface TransferResult {
  transferId: string;
  amount:     number;
  from: { id: string; name: string; category: string; balanceAfter: number };
  to:   { id: string; name: string; category: string; balanceAfter: number };
}

export function useTransferFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fromAccountId:   string;
      toAccountId:     string;
      amount:          number;
      transferDate?:   string;
      referenceNumber?: string | null;
      notes?:          string | null;
    }) => {
      const { data } = await api.post('/finance/transfers', input);
      return data as TransferResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-transfers'] });
      qc.invalidateQueries({ queryKey: ['finance-transactions'] });
    },
  });
}
