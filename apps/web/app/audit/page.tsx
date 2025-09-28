import AuditLogTable from "./AuditLogTable";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

type AuditRecord = {
  logId: string;
  action: string;
  actorId?: string | null;
  targetId?: string | null;
  detail?: string | null;
  createdAt: string;
};

function normalizeAudit(row: any): AuditRecord | null {
  const rawId = row?.logId ?? row?.log_id ?? row?.id;
  if (!rawId) {
    return null;
  }

  return {
    logId: String(rawId),
    action: String(row?.action ?? row?.event ?? "UNKNOWN"),
    actorId: row?.actorId ?? row?.actor_id ?? null,
    targetId: row?.targetId ?? row?.target_id ?? row?.reportId ?? row?.report_id ?? null,
    detail: row?.detail ?? row?.details ?? null,
    createdAt: String(row?.createdAt ?? row?.created_at ?? new Date().toISOString())
  };
}

async function fetchAudit(): Promise<AuditRecord[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map(normalizeAudit).filter((log): log is AuditRecord => Boolean(log));
  } catch (err) {
    console.warn("Failed to load audit logs from Supabase", err);
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
