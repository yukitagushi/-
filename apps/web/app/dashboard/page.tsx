import { cookies } from "next/headers";
import ReportDashboard from "./ReportDashboard";

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
    if (!res.ok) {
      throw new Error(`Unexpected status ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.warn("Failed to load reports from API", err);
    return [];
  }
}

export default async function DashboardPage() {
  const reports = await fetchReports();
  return (
    <section className="page" aria-label="ダッシュボード">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">ダッシュボード</span>
      </nav>
      <h1 className="page-title">通報ダッシュボード</h1>

      <ReportDashboard initialReports={reports} />
    </section>
  );
}
