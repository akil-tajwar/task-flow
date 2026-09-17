-- Purchase module: enums, tables, indexes

CREATE TYPE "public"."po_status" AS ENUM('draft', 'sent', 'partially_received', 'received', 'cancelled');
CREATE TYPE "public"."pr_status" AS ENUM('draft', 'confirmed', 'cancelled');
CREATE TYPE "public"."purchase_payment_mode" AS ENUM('cash', 'bank', 'credit');
CREATE TYPE "public"."pr_payment_status" AS ENUM('unpaid', 'partial', 'paid');
CREATE TYPE "public"."vendor_ledger_type" AS ENUM('purchase', 'payment', 'adjustment');

CREATE TABLE "purchase_orders" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"     uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "vendor_id"     uuid NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "store_id"      uuid NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT,
  "po_number"     varchar(20) NOT NULL,
  "status"        "po_status" NOT NULL DEFAULT 'draft',
  "order_date"    varchar(10) NOT NULL,
  "expected_date" varchar(10),
  "subtotal"      numeric(15,2) NOT NULL DEFAULT '0',
  "tax_amount"    numeric(15,2) NOT NULL DEFAULT '0',
  "total"         numeric(15,2) NOT NULL DEFAULT '0',
  "notes"         text,
  "created_by"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"    timestamp NOT NULL DEFAULT now(),
  "updated_at"    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "purchase_order_items" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL,
  "po_id"        uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "product_id"   uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "variant_id"   uuid REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  "quantity"     integer NOT NULL,
  "received_qty" integer NOT NULL DEFAULT 0,
  "unit_price"   numeric(15,2) NOT NULL,
  "tax_rate"     numeric(5,2) NOT NULL DEFAULT '0',
  "tax_amount"   numeric(15,2) NOT NULL DEFAULT '0',
  "total"        numeric(15,2) NOT NULL,
  "notes"        text
);

CREATE TABLE "purchase_receipts" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "vendor_id"      uuid NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "store_id"       uuid NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT,
  "po_id"          uuid REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
  "receipt_number" varchar(20) NOT NULL,
  "receipt_date"   varchar(10) NOT NULL,
  "status"         "pr_status" NOT NULL DEFAULT 'draft',
  "payment_status" "pr_payment_status" NOT NULL DEFAULT 'unpaid',
  "subtotal"       numeric(15,2) NOT NULL DEFAULT '0',
  "tax_amount"     numeric(15,2) NOT NULL DEFAULT '0',
  "total"          numeric(15,2) NOT NULL DEFAULT '0',
  "paid_amount"    numeric(15,2) NOT NULL DEFAULT '0',
  "balance_due"    numeric(15,2) NOT NULL DEFAULT '0',
  "notes"          text,
  "confirmed_at"   timestamp,
  "confirmed_by"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"     timestamp NOT NULL DEFAULT now(),
  "updated_at"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "purchase_receipt_items" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"   uuid NOT NULL,
  "receipt_id"  uuid NOT NULL REFERENCES "purchase_receipts"("id") ON DELETE CASCADE,
  "product_id"  uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "variant_id"  uuid REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  "po_item_id"  uuid REFERENCES "purchase_order_items"("id") ON DELETE SET NULL,
  "quantity"    integer NOT NULL,
  "unit_price"  numeric(15,2) NOT NULL,
  "tax_rate"    numeric(5,2) NOT NULL DEFAULT '0',
  "tax_amount"  numeric(15,2) NOT NULL DEFAULT '0',
  "total"       numeric(15,2) NOT NULL,
  "notes"       text
);

CREATE TABLE "purchase_payments" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "receipt_id"       uuid NOT NULL REFERENCES "purchase_receipts"("id") ON DELETE CASCADE,
  "vendor_id"        uuid NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "payment_date"     varchar(10) NOT NULL,
  "payment_mode"     "purchase_payment_mode" NOT NULL,
  "account_id"       uuid REFERENCES "financial_accounts"("id") ON DELETE SET NULL,
  "amount"           numeric(15,2) NOT NULL,
  "reference_number" varchar(100),
  "notes"            text,
  "created_by"       uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "vendor_ledger" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "vendor_id"      uuid NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "type"           "vendor_ledger_type" NOT NULL,
  "reference_type" varchar(50),
  "reference_id"   uuid,
  "debit"          numeric(15,2) NOT NULL DEFAULT '0',
  "credit"         numeric(15,2) NOT NULL DEFAULT '0',
  "balance_after"  numeric(15,2) NOT NULL,
  "notes"          text,
  "created_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"     timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "po_tenant_idx"          ON "purchase_orders"("tenant_id");
CREATE INDEX "po_vendor_idx"          ON "purchase_orders"("vendor_id");
CREATE INDEX "po_status_idx"          ON "purchase_orders"("status");
CREATE INDEX "po_items_po_idx"        ON "purchase_order_items"("po_id");
CREATE INDEX "pr_tenant_idx"          ON "purchase_receipts"("tenant_id");
CREATE INDEX "pr_vendor_idx"          ON "purchase_receipts"("vendor_id");
CREATE INDEX "pr_status_idx"          ON "purchase_receipts"("status");
CREATE INDEX "pr_po_idx"              ON "purchase_receipts"("po_id");
CREATE INDEX "pr_items_receipt_idx"   ON "purchase_receipt_items"("receipt_id");
CREATE INDEX "payments_receipt_idx"   ON "purchase_payments"("receipt_id");
CREATE INDEX "payments_vendor_idx"    ON "purchase_payments"("vendor_id");
CREATE INDEX "vl_tenant_vendor_idx"   ON "vendor_ledger"("tenant_id", "vendor_id");
CREATE INDEX "vl_created_at_idx"      ON "vendor_ledger"("created_at");
