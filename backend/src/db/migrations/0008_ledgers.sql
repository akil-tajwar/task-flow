-- ─── Customer Ledger ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE customer_ledger_type AS ENUM ('sale', 'payment', 'return', 'adjustment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "customer_ledger" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id"    uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "type"           customer_ledger_type NOT NULL,
  "reference_type" varchar(50),
  "reference_id"   uuid,
  "debit"          numeric(15, 2) NOT NULL DEFAULT '0',
  "credit"         numeric(15, 2) NOT NULL DEFAULT '0',
  "balance_after"  numeric(15, 2) NOT NULL,
  "notes"          text,
  "created_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cl_tenant_customer_idx" ON "customer_ledger" ("tenant_id", "customer_id");
CREATE INDEX IF NOT EXISTS "cl_created_at_idx"       ON "customer_ledger" ("created_at");
