CREATE TYPE "public"."account_category" AS ENUM('cash', 'bank');--> statement-breakpoint
CREATE TYPE "public"."account_txn_type" AS ENUM('opening_balance', 'deposit', 'withdrawal', 'payment', 'receipt', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('cash_drawer', 'savings', 'current', 'overdraft');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "account_txn_type" NOT NULL,
	"direction" varchar(3) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2),
	"notes" text,
	"reference_type" varchar(100),
	"reference_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"store_id" uuid,
	"category" "account_category" NOT NULL,
	"account_type" "account_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"bank_name" varchar(255),
	"account_number" varchar(100),
	"ifsc_code" varchar(50),
	"branch_name" varchar(255),
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_txn_account_idx" ON "account_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_txn_tenant_idx" ON "account_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_txn_created_at_idx" ON "account_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_accounts_tenant_idx" ON "financial_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_accounts_store_idx" ON "financial_accounts" USING btree ("store_id");