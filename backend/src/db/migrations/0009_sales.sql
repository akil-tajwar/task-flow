-- 0009_sales: Add average cost tracking + full sales invoice module

-- ── 1. Average cost on inventory ─────────────────────────────────────────────
ALTER TABLE "inventory" ADD COLUMN "average_cost" NUMERIC(15, 4) NOT NULL DEFAULT 0;

-- ── 2. Unit cost on stock_movements (for COGS) ────────────────────────────────
ALTER TABLE "stock_movements" ADD COLUMN "unit_cost" NUMERIC(15, 4) NOT NULL DEFAULT 0;

-- ── 3. Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "sales_invoice_status"  AS ENUM ('draft', 'confirmed', 'cancelled');
CREATE TYPE "sales_payment_status"  AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE "sales_payment_mode"    AS ENUM ('cash', 'bank', 'credit');

-- ── 4. Sales invoices ─────────────────────────────────────────────────────────
CREATE TABLE "sales_invoices" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "store_id"        uuid NOT NULL REFERENCES "stores"("id")  ON DELETE RESTRICT,
  "invoice_number"  varchar(50) NOT NULL,
  "invoice_date"    date NOT NULL DEFAULT CURRENT_DATE,

  -- Customer (quick entry — no full account required)
  "customer_id"     uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "customer_name"   varchar(255),
  "customer_phone"  varchar(50),

  -- Financials
  "subtotal"        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "tax_amount"      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "total"           NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "total_cost"      NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- COGS (avg cost × qty)
  "gross_profit"    NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- total − total_cost

  "paid_amount"     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "balance_due"     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "payment_status"  sales_payment_status NOT NULL DEFAULT 'unpaid',
  "status"          sales_invoice_status NOT NULL DEFAULT 'draft',

  "notes"           text,
  "created_by"      uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "confirmed_at"    timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

-- ── 5. Sales invoice items ────────────────────────────────────────────────────
CREATE TABLE "sales_invoice_items" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"      uuid NOT NULL REFERENCES "sales_invoices"("id") ON DELETE CASCADE,
  "product_id"      uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "variant_id"      uuid REFERENCES "product_variants"("id") ON DELETE RESTRICT,

  "quantity"        integer NOT NULL,
  "unit_price"      NUMERIC(15, 2) NOT NULL,
  "unit_cost"       NUMERIC(15, 4) NOT NULL DEFAULT 0,   -- avg cost at time of sale
  "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "tax_rate"        NUMERIC(5,  2) NOT NULL DEFAULT 0,
  "tax_amount"      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "subtotal"        NUMERIC(15, 2) NOT NULL,             -- qty × price − discount
  "total"           NUMERIC(15, 2) NOT NULL,             -- subtotal + tax
  "cost_total"      NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- qty × unit_cost
  "gross_profit"    NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- total − cost_total
  "notes"           text
);

-- ── 6. Sales payments ─────────────────────────────────────────────────────────
CREATE TABLE "sales_payments" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id")           ON DELETE CASCADE,
  "invoice_id"       uuid NOT NULL REFERENCES "sales_invoices"("id")    ON DELETE CASCADE,
  "payment_mode"     sales_payment_mode NOT NULL,
  "account_id"       uuid REFERENCES "financial_accounts"("id")         ON DELETE SET NULL,
  "amount"           NUMERIC(15, 2) NOT NULL,
  "payment_date"     date NOT NULL DEFAULT CURRENT_DATE,
  "reference_number" varchar(100),
  "notes"            text,
  "created_by"       uuid REFERENCES "users"("id")                      ON DELETE SET NULL,
  "created_at"       timestamp NOT NULL DEFAULT now()
);

-- ── 7. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX si_tenant_store_idx   ON "sales_invoices"(tenant_id, store_id);
CREATE INDEX si_invoice_date_idx   ON "sales_invoices"(invoice_date);
CREATE INDEX si_customer_idx       ON "sales_invoices"(customer_id);
CREATE INDEX si_status_idx         ON "sales_invoices"(status, payment_status);
CREATE INDEX sii_invoice_idx       ON "sales_invoice_items"(invoice_id);
CREATE INDEX sp_invoice_idx        ON "sales_payments"(invoice_id);
CREATE INDEX sp_tenant_idx         ON "sales_payments"(tenant_id);
