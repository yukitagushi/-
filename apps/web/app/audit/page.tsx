import { cookies } from "next/headers";
import AuditLogTable from "./AuditLogTable";

const API_BASE =
  process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function fetchAudit() {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const res = await fetch(`${API_BASE}/audit`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  } catch (err) {
    console.warn("Failed to load audit logs", err);
    return [];
  }
}

export default async function AuditPage() {
  const logs = await fetchAudit();
  return (
    <section className="page" aria-label="監査ログ">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">監査ログ</span>
      </nav>
      <h1 className="page-title">監査ログ（CSVエクスポート）</h1>
      <AuditLogTable initialLogs={logs} />
    </section>
  );
}
