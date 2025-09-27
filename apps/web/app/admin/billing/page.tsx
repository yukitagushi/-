import { cookies } from "next/headers";
import BillingBoard from "./BillingBoard";

const API_BASE =
  process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function fetchInvoices() {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const res = await fetch(`${API_BASE}/billing/invoices`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn("Failed to load invoices", err);
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
