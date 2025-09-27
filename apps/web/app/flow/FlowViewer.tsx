"use client";

import { useEffect, useMemo, useState } from "react";

type Report = {
  reportId: string;
  title: string;
  category?: string | null;
  status: string;
  assigneeName?: string | null;
  riskScore: number;
  createdAt: string;
  body?: string;
};

const severityOptions = [
  { id: "safety", label: "人身安全リスク" },
  { id: "legal", label: "法令違反の疑い" },
  { id: "reputation", label: "風評リスク" }
];

type Props = {
  reports: Report[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function FlowViewer({ reports }: Props) {
  const [selectedId, setSelectedId] = useState(reports[0]?.reportId ?? "");
  const [severity, setSeverity] = useState<string[]>([]);
  const [actions, setActions] = useState<Array<{ owner: string; title: string }>>([]);
  const [actionOwner, setActionOwner] = useState("");
  const [actionTitle, setActionTitle] = useState("");

  const report = useMemo(
    () => reports.find((r) => r.reportId === selectedId) ?? null,
    [reports, selectedId]
  );

  useEffect(() => {
    if (reports.length && !reports.find((r) => r.reportId === selectedId)) {
      setSelectedId(reports[0].reportId);
    }
  }, [reports, selectedId]);

  useEffect(() => {
    setSeverity([]);
    setActions([]);
    setActionOwner("");
    setActionTitle("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_BASE}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flow.open", targetId: selectedId, reportId: selectedId }),
      credentials: "include"
    }).catch((err) => console.warn("audit log failed", err));
  }, [selectedId]);

  const addAction = () => {
    if (!actionTitle.trim()) return;
    setActions((prev) => [...prev, { owner: actionOwner.trim(), title: actionTitle.trim() }]);
    setActionTitle("");
  };

  const toggleSeverity = (id: string) => {
    setSeverity((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="row">
        <select
          id="flowSelect"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {reports.map((item) => (
            <option key={item.reportId} value={item.reportId}>
              {item.title}
            </option>
          ))}
        </select>
        <div className="row__right">
          <button className="primary" id="btnPrint" type="button" onClick={() => window.print()}>
            このページをPDFへ
          </button>
        </div>
      </div>

      {report ? (
        <div>
          <div className="flow">
            <div className="kv">
              <span className="k">件名</span>
              <span className="v" id="flowTitle">
                {report.title}
              </span>
            </div>
            <div className="kv">
              <span className="k">カテゴリ</span>
              <span className="v" id="flowCat">
                {report.category ?? "未設定"}
              </span>
            </div>
            <div className="kv">
              <span className="k">ステータス</span>
              <span className="v" id="flowStatus">
                {report.status}
              </span>
            </div>
            <div className="kv">
              <span className="k">担当</span>
              <span className="v" id="flowOwner">
                {report.assigneeName || "未設定"}
              </span>
            </div>
            <div className="kv">
              <span className="k">作成</span>
              <span className="v" id="flowDate">
                {new Date(report.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="kv">
              <span className="k">リスク</span>
              <span className="v">{report.riskScore}</span>
            </div>
          </div>

          <h2>重大度チェック</h2>
          <ul className="checklist" id="sevList">
            {severityOptions.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={severity.includes(item.id)}
                    onChange={() => toggleSeverity(item.id)}
                  />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>

          <h2>対応策メモ</h2>
          <div className="form row">
            <input
              type="text"
              id="actOwner"
              placeholder="担当（任意） 例：総務A"
              value={actionOwner}
              onChange={(event) => setActionOwner(event.target.value)}
            />
            <input
              type="text"
              id="actTitle"
              placeholder="対応の概要"
              value={actionTitle}
              onChange={(event) => setActionTitle(event.target.value)}
            />
            <button className="primary" type="button" id="addAction" onClick={addAction}>
              追加
            </button>
          </div>
          <ul className="action-list" id="actionList">
            {actions.map((action, index) => (
              <li key={`${action.title}-${index}`}>
                <strong>{action.owner || "担当未設定"}</strong>: {action.title}
              </li>
            ))}
          </ul>
          {report.body && (
            <div style={{ marginTop: 16 }}>
              <h2>通報本文</h2>
              <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                {report.body}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="muted">表示できる通報がありません。</p>
      )}
    </>
  );
}
