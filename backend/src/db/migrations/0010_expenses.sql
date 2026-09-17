-- Expense Heads
CREATE TABLE "expense_heads" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name"        varchar(255) NOT NULL,
  "description" text,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  "updated_at"  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "expense_heads_tenant_name_unique" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "expense_heads_tenant_idx" ON "expense_heads"("tenant_id");

-- Expenses
CREATE TABLE "expenses" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "expense_head_id"  uuid NOT NULL REFERENCES "expense_heads"("id") ON DELETE RESTRICT,
  "account_id"       uuid NOT NULL REFERENCES "financial_accounts"("id") ON DELETE RESTRICT,
  "amount"           NUMERIC(15, 2) NOT NULL,
  "expense_date"     varchar(10) NOT NULL,
  "reference_number" varchar(100),
  "notes"            text,
  "created_by"       uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "expenses_tenant_idx"   ON "expenses"("tenant_id");
CREATE INDEX "expenses_head_idx"     ON "expenses"("expense_head_id");
CREATE INDEX "expenses_account_idx"  ON "expenses"("account_id");
CREATE INDEX "expenses_date_idx"     ON "expenses"("expense_date");
