import { cookies } from "next/headers";
import FlowViewer from "./FlowViewer";

const API_BASE =
  process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function fetchReports() {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const res = await fetch(`${API_BASE}/reports`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!res.ok) throw new Error("Failed to load reports");
    return res.json();
  } catch (err) {
    console.warn("Failed to load reports", err);
    return [];
  }
}

export default async function FlowPage() {
  const reports = await fetchReports();
  return (
    <section className="page" aria-label="ケースフロー">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">ケースフロー</span>
      </nav>
      <h1 className="page-title">ケースフロー（PDF共有）</h1>

      <FlowViewer reports={reports} />
    </section>
  );
}
