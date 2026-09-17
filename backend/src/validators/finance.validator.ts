import { z } from 'zod';

const CATEGORIES  = ['cash', 'bank'] as const;
const TYPES_CASH  = ['cash_drawer'] as const;
const TYPES_BANK  = ['savings', 'current', 'overdraft'] as const;
const ALL_TYPES   = [...TYPES_CASH, ...TYPES_BANK] as const;

export const createAccountSchema = z
  .object({
    category:      z.enum(CATEGORIES),
    accountType:   z.enum(ALL_TYPES),
    name:          z.string().min(1).max(255),
    storeId:       z.string().uuid().optional().nullable(),
    bankName:      z.string().max(255).optional().nullable(),
    accountNumber: z.string().max(100).optional().nullable(),
    ifscCode:      z.string().max(50).optional().nullable(),
    branchName:    z.string().max(255).optional().nullable(),
    openingBalance: z.number().min(0).default(0),
    isDefault:     z.boolean().optional(),
    notes:         z.string().max(1000).optional().nullable(),
  })
  .refine(
    (d) => d.category === 'cash' || !!d.bankName,
    { message: 'Bank name is required for bank accounts', path: ['bankName'] },
  );

export const updateAccountSchema = z.object({
  name:          z.string().min(1).max(255).optional(),
  storeId:       z.string().uuid().optional().nullable(),
  bankName:      z.string().max(255).optional().nullable(),
  accountNumber: z.string().max(100).optional().nullable(),
  ifscCode:      z.string().max(50).optional().nullable(),
  branchName:    z.string().max(255).optional().nullable(),
  isDefault:     z.boolean().optional(),
  isActive:      z.boolean().optional(),
  notes:         z.string().max(1000).optional().nullable(),
});

export const setOpeningBalanceSchema = z.object({
  openingBalance: z.number().min(0),
  notes:          z.string().max(1000).optional(),
});

export const transferSchema = z.object({
  fromAccountId:   z.string().uuid(),
  toAccountId:     z.string().uuid(),
  amount:          z.number().positive(),
  transferDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes:           z.string().max(1000).optional().nullable(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: 'Source and destination accounts must be different',
  path: ['toAccountId'],
});

export type CreateAccountInput      = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput      = z.infer<typeof updateAccountSchema>;
export type SetOpeningBalanceInput  = z.infer<typeof setOpeningBalanceSchema>;
export type TransferInput           = z.infer<typeof transferSchema>;
