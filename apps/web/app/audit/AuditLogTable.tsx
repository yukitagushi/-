"use client";

import { useState, type CSSProperties } from "react";

type AuditLog = {
  logId: string;
  action: string;
  actorId?: string | null;
  targetId?: string | null;
  detail?: string | null;
  createdAt: string;
};

type Props = {
  initialLogs: AuditLog[];
};

export default function AuditLogTable({ initialLogs }: Props) {
  const [logs] = useState(initialLogs);

  const downloadCsv = () => {
    const header = ["createdAt", "action", "actorId", "targetId", "detail"];
    const rows = logs.map((log) =>
      [log.createdAt, log.action, log.actorId ?? "", log.targetId ?? "", log.detail ?? ""].map((field) =>
        `"${String(field).replace(/"/g, '""')}"`
      )
    );
    const csv = [header.map((h) => `"${h}"`).join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="row">
        <div className="chips">
          <span className="badge">総件数: {logs.length}</span>
        </div>
        <div className="row__right">
          <button className="primary" type="button" onClick={downloadCsv}>
            CSVダウンロード
          </button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={cellHead}>日時</th>
              <th style={cellHead}>アクション</th>
              <th style={cellHead}>実行者</th>
              <th style={cellHead}>対象</th>
              <th style={cellHead}>詳細</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.logId}>
                <td style={cellBody}>{new Date(log.createdAt).toLocaleString("ja-JP")}</td>
                <td style={cellBody}>{log.action}</td>
                <td style={cellBody}>{log.actorId || "-"}</td>
                <td style={cellBody}>{log.targetId || "-"}</td>
                <td style={cellBody}>{log.detail || ""}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td style={cellBody} colSpan={5}>
                  ログがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellHead: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
  padding: "8px 6px"
};

const cellBody: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "8px 6px",
  verticalAlign: "top"
};
