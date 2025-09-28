import BillingBoard from "./BillingBoard";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

type InvoiceRecord = {
  invoiceId: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  amountJpy: number;
  memo?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeInvoice(row: any): InvoiceRecord | null {
  const rawId = row?.invoiceId ?? row?.invoice_id ?? row?.id;
  if (!rawId) {
    return null;
  }

  const amount = row?.amountJpy ?? row?.amount_jpy ?? row?.amount ?? 0;

  return {
    invoiceId: String(rawId),
    customerName: String(row?.customerName ?? row?.customer_name ?? "不明な顧客"),
    periodFrom: String(row?.periodFrom ?? row?.period_from ?? ""),
    periodTo: String(row?.periodTo ?? row?.period_to ?? ""),
    amountJpy: typeof amount === "number" ? amount : Number(amount) || 0,
    memo: row?.memo ?? row?.notes ?? null,
    status: String(row?.status ?? "draft"),
    createdAt: String(row?.createdAt ?? row?.created_at ?? new Date().toISOString()),
    updatedAt: String(row?.updatedAt ?? row?.updated_at ?? new Date().toISOString())
  };
}

async function fetchInvoices(): Promise<InvoiceRecord[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? [])
      .map(normalizeInvoice)
      .filter((invoice): invoice is InvoiceRecord => Boolean(invoice));
  } catch (err) {
    console.warn("Failed to load invoices from Supabase", err);
    return [];
  }
}

export default async function BillingPage() {
  const invoices = await fetchInvoices();
  return (
    <section className="page" aria-label="請求管理">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">請求管理</span>
      </nav>
      <h1 className="page-title">請求書管理</h1>
      <div className="page-meta">手動請求の一覧・CSVエクスポート・ステータス更新</div>
      <BillingBoard initialInvoices={invoices} />
    </section>
  );
}
