export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type Role = 'super_admin' | 'admin' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  tenantId: string;
  parentId?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantOption {
  id: string;
  productId: string;
  tenantId: string;
  name: string;
  values: string[];
  sortOrder: number;
}

export interface ProductStoreStock {
  storeId:   string;
  storeName: string;
  storeCode: string;
  quantity:  number;
}

export interface ProductInventorySummary {
  total:  number;
  stores: ProductStoreStock[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  tenantId: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  // per-store inventory for this variant (populated by GET /products/:id)
  inventory?: Array<{ id: string; storeId: string; quantity: number; reservedQuantity: number; store: { id: string; name: string; code: string; isDefault: boolean } }>;
}

export interface ProductUOM {
  id: string;
  productId: string;
  tenantId: string;
  name: string;
  abbreviation: string;
  conversionFactor: string;
  price?: string | null;
  isBase: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  brandId?: string | null;
  categoryId?: string | null;
  brand?: Brand | null;
  category?: Category | null;
  variantOptions?: ProductVariantOption[];
  variants?: ProductVariant[];
  uoms?: ProductUOM[];
  // per-store inventory (non-variant products only; populated by list + get)
  inventory?: Array<{ id: string; storeId: string; quantity: number; reservedQuantity: number; store: Store }>;
  // summary shape populated by the list endpoint
  inventorySummary?: ProductInventorySummary;
  name: string;
  description?: string | null;
  sku?: string | null;
  basePrice: string;
  hasVariants: boolean;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  loyaltyPoints: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Stores & Inventory ───────────────────────────────────────────────────────

export interface Store {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'receive' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'damage' | 'return' | 'opening_balance';

export interface OpeningBalanceRow {
  productId:         string;
  productName:       string;
  productSku:        string | null;
  variantId:         string | null;
  variantSku:        string | null;
  variantAttributes: Record<string, string> | null;
  currentQuantity:   number;
}

export interface InventoryRow {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  reservedQuantity: number;
  updatedAt: string;
  store: Store;
  product: Product;
  variant?: ProductVariant | null;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  variantId?: string | null;
  type: StockMovementType;
  quantity: number;
  referenceId?: string | null;
  referenceType?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  store: Store;
  product: Product;
  variant?: ProductVariant | null;
  createdByUser?: { id: string; name: string } | null;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}

export interface StockTransfer {
  id: string;
  tenantId: string;
  fromStoreId: string;
  toStoreId: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string | null;
  createdBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fromStore: Store;
  toStore: Store;
  items: StockTransferItem[];
  createdByUser?: { id: string; name: string } | null;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export type AccountCategory = 'cash' | 'bank';
export type AccountType     = 'cash_drawer' | 'savings' | 'current' | 'overdraft';
export type AccountTxnType  =
  | 'opening_balance' | 'deposit' | 'withdrawal'
  | 'payment' | 'receipt' | 'transfer_in' | 'transfer_out';

export interface FinancialAccount {
  id:             string;
  tenantId:       string;
  storeId?:       string | null;
  store?:         Store | null;
  category:       AccountCategory;
  accountType:    AccountType;
  name:           string;
  bankName?:      string | null;
  accountNumber?: string | null;
  ifscCode?:      string | null;
  branchName?:    string | null;
  openingBalance: string;
  currentBalance: string;
  isDefault:      boolean;
  isActive:       boolean;
  notes?:         string | null;
  createdAt:      string;
  updatedAt:      string;
  transactions?:  AccountTransaction[];
}

export interface AccountTransaction {
  id:           string;
  tenantId:     string;
  accountId:    string;
  type:         AccountTxnType;
  direction:    'in' | 'out';
  amount:       string;
  balanceAfter?: string | null;
  notes?:       string | null;
  referenceType?: string | null;
  referenceId?:   string | null;
  createdBy?:   string | null;
  createdByUser?: { id: string; name: string } | null;
  createdAt:    string;
}

export interface FundTransfer {
  transferId:      string | null;
  amount:          string;
  notes:           string | null;
  createdAt:       string;
  fromAccountId:   string;
  fromAccountName: string;
  fromCategory:    AccountCategory;
  toAccountId:     string;
  toAccountName:   string;
  toCategory:      AccountCategory;
  createdBy:       string | null;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseHead {
  id:          string;
  tenantId:    string;
  name:        string;
  description: string | null;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
  expenses?:   { id: string }[];
}

export interface Expense {
  id:              string;
  tenantId:        string;
  expenseHeadId:   string;
  accountId:       string;
  amount:          string;
  expenseDate:     string;
  referenceNumber: string | null;
  notes:           string | null;
  createdBy:       string | null;
  createdAt:       string;
  updatedAt:       string;
  expenseHead?:    { id: string; name: string } | null;
  account?:        { id: string; name: string; category: AccountCategory } | null;
  createdByUser?:  { id: string; name: string } | null;
}

export interface AccountLedgerRow extends AccountTransaction {
  runningBalance: number;
}

export interface AccountLedger {
  account:        FinancialAccount;
  openingBalance: number;
  closingBalance: number;
  totalIn:        number;
  totalOut:       number;
  transactions:   AccountLedgerRow[];
  dateFrom:       string | null;
  dateTo:         string | null;
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export type POStatus          = 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
export type PRStatus          = 'draft' | 'confirmed' | 'cancelled';
export type PurchasePayMode   = 'cash' | 'bank' | 'credit';
export type PRPaymentStatus   = 'unpaid' | 'partial' | 'paid';
export type VendorLedgerType  = 'purchase' | 'payment' | 'adjustment';

export interface PurchaseOrderItem {
  id:          string;
  tenantId:    string;
  poId:        string;
  productId:   string;
  variantId?:  string | null;
  quantity:    number;
  receivedQty: number;
  unitPrice:   string;
  taxRate:     string;
  taxAmount:   string;
  total:       string;
  notes?:      string | null;
  product?:    Product;
  variant?:    ProductVariant | null;
}

export interface PurchaseOrder {
  id:              string;
  tenantId:        string;
  vendorId:        string;
  storeId:         string;
  poNumber:        string;
  status:          POStatus;
  orderDate:       string;
  expectedDate?:   string | null;
  subtotal:        string;
  taxAmount:       string;
  total:           string;
  notes?:          string | null;
  vendor?:         Vendor;
  store?:          Store;
  createdByUser?:  { id: string; name: string } | null;
  items?:          PurchaseOrderItem[];
  itemCount?:      number;
  createdAt:       string;
  updatedAt:       string;
}

export interface PurchaseReceiptItem {
  id:        string;
  tenantId:  string;
  receiptId: string;
  productId: string;
  variantId?: string | null;
  poItemId?:  string | null;
  quantity:  number;
  unitPrice: string;
  taxRate:   string;
  taxAmount: string;
  total:     string;
  notes?:    string | null;
  product?:  Product;
  variant?:  ProductVariant | null;
}

export interface PurchasePayment {
  id:              string;
  tenantId:        string;
  receiptId:       string;
  vendorId:        string;
  paymentDate:     string;
  paymentMode:     PurchasePayMode;
  accountId?:      string | null;
  account?:        { id: string; name: string; category: string } | null;
  amount:          string;
  referenceNumber?: string | null;
  notes?:          string | null;
  createdAt:       string;
}

export interface PurchaseReceipt {
  id:              string;
  tenantId:        string;
  vendorId:        string;
  storeId:         string;
  poId?:           string | null;
  receiptNumber:   string;
  receiptDate:     string;
  status:          PRStatus;
  paymentStatus:   PRPaymentStatus;
  subtotal:        string;
  taxAmount:       string;
  total:           string;
  paidAmount:      string;
  balanceDue:      string;
  notes?:          string | null;
  confirmedAt?:    string | null;
  vendor?:         Vendor;
  store?:          Store;
  po?:             { id: string; poNumber: string } | null;
  confirmedByUser?: { id: string; name: string } | null;
  createdByUser?:  { id: string; name: string } | null;
  items?:          PurchaseReceiptItem[];
  payments?:       PurchasePayment[];
  itemCount?:      number;
  createdAt:       string;
  updatedAt:       string;
}

export interface VendorLedgerEntry {
  id:            string;
  tenantId:      string;
  vendorId:      string;
  type:          VendorLedgerType;
  referenceType?: string | null;
  referenceId?:   string | null;
  debit:         string;
  credit:        string;
  balanceAfter:  string;
  notes?:        string | null;
  createdByUser?: { id: string; name: string } | null;
  createdAt:     string;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export type SalesInvoiceStatus = 'draft' | 'confirmed' | 'cancelled';
export type SalesPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type SalesPaymentMode   = 'cash' | 'bank' | 'credit';

export interface SalesInvoiceItem {
  id:             string;
  invoiceId:      string;
  productId:      string;
  variantId?:     string | null;
  quantity:       number;
  unitPrice:      string;
  unitCost:       string;
  discountAmount: string;
  taxRate:        string;
  taxAmount:      string;
  subtotal:       string;
  total:          string;
  costTotal:      string;
  grossProfit:    string;
  notes?:         string | null;
  product?:       { id: string; name: string; sku?: string | null };
  variant?:       { id: string; attributes: Record<string, string> } | null;
}

export interface SalesPayment {
  id:              string;
  tenantId:        string;
  invoiceId:       string;
  paymentMode:     SalesPaymentMode;
  accountId?:      string | null;
  account?:        { id: string; name: string; category: string } | null;
  amount:          string;
  paymentDate:     string;
  referenceNumber?: string | null;
  notes?:          string | null;
  createdAt:       string;
}

export interface SalesInvoice {
  id:             string;
  tenantId:       string;
  storeId:        string;
  invoiceNumber:  string;
  invoiceDate:    string;
  customerId?:    string | null;
  customerName?:  string | null;
  customerPhone?: string | null;
  subtotal:       string;
  discountAmount: string;
  taxAmount:      string;
  total:          string;
  totalCost:      string;
  grossProfit:    string;
  paidAmount:     string;
  balanceDue:     string;
  paymentStatus:  SalesPaymentStatus;
  status:         SalesInvoiceStatus;
  notes?:         string | null;
  confirmedAt?:   string | null;
  createdAt:      string;
  updatedAt:      string;
  store?:         Store;
  customer?:      Customer | null;
  createdByUser?: { id: string; name: string } | null;
  items?:         SalesInvoiceItem[];
  payments?:      SalesPayment[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  tenantId: string;
  userId?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: string;
  tax: string;
  total: string;
  createdAt: string;
  updatedAt: string;
}
