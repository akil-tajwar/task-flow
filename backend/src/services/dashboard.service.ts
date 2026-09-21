import { sql } from "drizzle-orm";
import { db } from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  // Both roles
  todaySales: { count: number; total: number; grossProfit: number };
  monthSales: {
    count: number;
    total: number;
    grossProfit: number;
    margin: number;
    vsLastMonth: number;
  };
  categoryBreakdown: Array<{
    name: string;
    total: number;
    grossProfit: number;
    quantity: number;
    count: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string | null;
    total: number;
    status: string;
    paymentStatus: string;
  }>;

  // Admin only
  cashBankSummary?: {
    totalCash: number;
    totalBank: number;
    combined: number;
    accounts: Array<{
      id: string;
      name: string;
      category: string;
      balance: number;
    }>;
  };
  salesTrend?: Array<{
    date: string;
    total: number;
    grossProfit: number;
    count: number;
  }>;
  topProducts?: Array<{
    name: string;
    sku: string;
    quantity: number;
    total: number;
    grossProfit: number;
  }>;
  paymentModeBreakdown?: Array<{ mode: string; count: number; total: number }>;
  outstandingReceivables?: { count: number; total: number };
  totalExpensesMonth?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const dashboardService = {
  async get(tenantId: string, role: string): Promise<DashboardData> {
    // ── Shared queries (all roles) ───────────────────────────────────────────

    const [todayRow] = await db.execute<{
      count: string;
      total: string;
      profit: string;
    }>(sql`
      SELECT
        COUNT(*)::text                     AS count,
        COALESCE(SUM(total),0)::text       AS total,
        COALESCE(SUM(gross_profit),0)::text AS profit
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND invoice_date = CURRENT_DATE
    `);

    const [monthRow] = await db.execute<{
      count: string;
      total: string;
      profit: string;
    }>(sql`
      SELECT
        COUNT(*)::text                     AS count,
        COALESCE(SUM(total),0)::text       AS total,
        COALESCE(SUM(gross_profit),0)::text AS profit
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND invoice_date >= date_trunc('month', CURRENT_DATE)
    `);

    const [lastMonthRow] = await db.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(total),0)::text AS total
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND invoice_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND invoice_date <  date_trunc('month', CURRENT_DATE)
    `);

    const catRows = await db.execute<{
      name: string;
      total: string;
      profit: string;
      qty: string;
      cnt: string;
    }>(sql`
      SELECT
        c.name,
        COALESCE(SUM(sii.total),0)::text        AS total,
        COALESCE(SUM(sii.gross_profit),0)::text AS profit,
        COALESCE(SUM(sii.quantity),0)::text      AS qty,
        COUNT(DISTINCT si.id)::text              AS cnt
      FROM sales_invoice_items sii
      JOIN products      p   ON sii.product_id  = p.id
      JOIN categories    c   ON p.category_id   = c.id
      JOIN sales_invoices si ON sii.invoice_id  = si.id
      WHERE si.tenant_id = ${tenantId}
        AND si.status    = 'confirmed'
        AND si.invoice_date >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 10
    `);

    const recentRows = await db.execute<{
      id: string;
      invoice_number: string;
      invoice_date: string;
      customer_name: string | null;
      total: string;
      status: string;
      payment_status: string;
    }>(sql`
      SELECT id, invoice_number, invoice_date::text, customer_name, total::text, status, payment_status
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
      ORDER BY created_at DESC
      LIMIT 8
    `);

    // ── Shared data assembly ─────────────────────────────────────────────────

    const monthTotal = parseFloat(monthRow?.total ?? "0");
    const monthProfit = parseFloat(monthRow?.profit ?? "0");
    const lastMonthTotal = parseFloat(lastMonthRow?.total ?? "0");
    const vsLastMonth =
      lastMonthTotal > 0
        ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    const data: DashboardData = {
      todaySales: {
        count: parseInt(todayRow?.count ?? "0", 10),
        total: parseFloat(todayRow?.total ?? "0"),
        grossProfit: parseFloat(todayRow?.profit ?? "0"),
      },
      monthSales: {
        count: parseInt(monthRow?.count ?? "0", 10),
        total: monthTotal,
        grossProfit: monthProfit,
        margin: monthTotal > 0 ? (monthProfit / monthTotal) * 100 : 0,
        vsLastMonth,
      },
      categoryBreakdown: catRows.map((r) => ({
        name: r.name,
        total: parseFloat(r.total),
        grossProfit: parseFloat(r.profit),
        quantity: parseInt(r.qty, 10),
        count: parseInt(r.cnt, 10),
      })),
      recentInvoices: recentRows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        invoiceDate: r.invoice_date,
        customerName: r.customer_name,
        total: parseFloat(r.total),
        status: r.status,
        paymentStatus: r.payment_status,
      })),
    };

    // ── Admin-only queries ───────────────────────────────────────────────────

    if (role === "admin" || role === "super_admin") {
      const [
        accountsData,
        trendRows,
        productRows,
        paymentRows,
        receivableRow,
        expenseRow,
      ] = await Promise.all([
        // Cash & bank accounts
        db.execute<{
          id: string;
          name: string;
          category: string;
          current_balance: string;
        }>(sql`
            SELECT id, name, category, current_balance::text
            FROM financial_accounts
            WHERE tenant_id = ${tenantId} AND is_active = true
            ORDER BY category, name
          `),

        // 14-day sales trend
        db.execute<{
          date: string;
          total: string;
          profit: string;
          count: string;
        }>(sql`
            SELECT
              invoice_date::text                   AS date,
              COALESCE(SUM(total),0)::text          AS total,
              COALESCE(SUM(gross_profit),0)::text   AS profit,
              COUNT(*)::text                        AS count
            FROM sales_invoices
            WHERE tenant_id = ${tenantId}
              AND status = 'confirmed'
              AND invoice_date >= CURRENT_DATE - INTERVAL '13 days'
            GROUP BY invoice_date
            ORDER BY invoice_date
          `),

        // Top 5 products this month
        db.execute<{
          name: string;
          sku: string;
          qty: string;
          total: string;
          profit: string;
        }>(sql`
            SELECT
              p.name,
              COALESCE(p.sku,'—')                AS sku,
              SUM(sii.quantity)::text             AS qty,
              COALESCE(SUM(sii.total),0)::text    AS total,
              COALESCE(SUM(sii.gross_profit),0)::text AS profit
            FROM sales_invoice_items sii
            JOIN products p ON sii.product_id = p.id
            JOIN sales_invoices si ON sii.invoice_id = si.id
            WHERE si.tenant_id = ${tenantId}
              AND si.status = 'confirmed'
              AND si.invoice_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY p.id, p.name, p.sku
            ORDER BY total DESC
            LIMIT 5
          `),

        // Payment mode breakdown this month
        db.execute<{ mode: string; count: string; total: string }>(sql`
            SELECT
              sp.payment_mode            AS mode,
              COUNT(*)::text             AS count,
              COALESCE(SUM(sp.amount),0)::text AS total
            FROM sales_payments sp
            JOIN sales_invoices si ON sp.invoice_id = si.id
            WHERE si.tenant_id = ${tenantId}
              AND si.status = 'confirmed'
              AND si.invoice_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY sp.payment_mode
            ORDER BY total DESC
          `),

        // Outstanding receivables
        db.execute<{ count: string; total: string }>(sql`
            SELECT
              COUNT(*)::text                   AS count,
              COALESCE(SUM(balance_due),0)::text AS total
            FROM sales_invoices
            WHERE tenant_id = ${tenantId}
              AND status = 'confirmed'
              AND payment_status IN ('unpaid','partial')
          `),

        // Total expenses this month (expense_date is varchar YYYY-MM-DD)
        db.execute<{ total: string }>(sql`
            SELECT COALESCE(SUM(amount),0)::text AS total
            FROM expenses
            WHERE tenant_id = ${tenantId}
              AND expense_date >= TO_CHAR(date_trunc('month', CURRENT_TIMESTAMP), 'YYYY-MM-DD')
          `),
      ]);

      const cashAccts = accountsData.filter((a) => a.category === "cash");
      const bankAccts = accountsData.filter((a) => a.category === "bank");
      const totalCash = cashAccts.reduce(
        (s, a) => s + parseFloat(a.current_balance),
        0,
      );
      const totalBank = bankAccts.reduce(
        (s, a) => s + parseFloat(a.current_balance),
        0,
      );

      // Fill missing trend dates with 0
      const trendMap = new Map(trendRows.map((r) => [r.date, r]));
      const trend: DashboardData["salesTrend"] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const row = trendMap.get(key);
        trend.push({
          date: key,
          total: parseFloat(row?.total ?? "0"),
          grossProfit: parseFloat(row?.profit ?? "0"),
          count: parseInt(row?.count ?? "0", 10),
        });
      }

      data.cashBankSummary = {
        totalCash,
        totalBank,
        combined: totalCash + totalBank,
        accounts: accountsData.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          balance: parseFloat(a.current_balance),
        })),
      };
      data.salesTrend = trend;
      data.topProducts = productRows.map((r) => ({
        name: r.name,
        sku: r.sku,
        quantity: parseInt(r.qty, 10),
        total: parseFloat(r.total),
        grossProfit: parseFloat(r.profit),
      }));
      data.paymentModeBreakdown = paymentRows.map((r) => ({
        mode: r.mode,
        count: parseInt(r.count, 10),
        total: parseFloat(r.total),
      }));
      data.outstandingReceivables = {
        count: parseInt(receivableRow?.[0]?.count ?? "0", 10),
        total: parseFloat(receivableRow?.[0]?.total ?? "0"),
      };
      data.totalExpensesMonth = parseFloat(expenseRow?.[0]?.total ?? "0");
    }

    return data;
  },
};
