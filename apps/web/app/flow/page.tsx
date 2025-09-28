import FlowViewer from "./FlowViewer";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

type FlowReport = {
  reportId: string;
  title: string;
  category?: string | null;
  status: string;
  assigneeName?: string | null;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  body?: string;
};

const STATUS_MAP: Record<string, string> = {
  received: "受付",
  investigating: "調査",
  in_progress: "対応中",
  resolved: "完了"
};

function normalizeReport(row: any): FlowReport | null {
  const rawId = row?.reportId ?? row?.report_id ?? row?.id;
  if (!rawId) {
    return null;
  }

  const createdAt = String(row?.createdAt ?? row?.created_at ?? new Date().toISOString());
  const updatedAt = String(row?.updatedAt ?? row?.updated_at ?? createdAt);
  const statusRaw = row?.status ?? row?.status_code ?? "受付";
  const status = STATUS_MAP[statusRaw as string] ?? String(statusRaw);
  const risk = row?.riskScore ?? row?.risk_score;
  const riskScore = typeof risk === "number" ? risk : Number(risk) || 0;

  return {
    reportId: String(rawId),
    title: String(row?.title ?? "(無題)"),
    category: row?.category ?? row?.category_name ?? null,
    status,
    assigneeName: row?.assigneeName ?? row?.assignee_name ?? null,
    riskScore,
    createdAt,
    updatedAt,
    body: row?.body ?? row?.body_plain ?? undefined
  };
}

async function fetchReports(): Promise<FlowReport[]> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? [])
      .map(normalizeReport)
      .filter((report): report is FlowReport => Boolean(report));
  } catch (err) {
    console.warn("Failed to load reports from Supabase", err);
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
