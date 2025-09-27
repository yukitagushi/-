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
  updatedAt: string;
  body: string;
};

type Props = {
  initialReports: Report[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function ReportDashboard({ initialReports }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports ?? []);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setReports(initialReports ?? []);
    try {
      const offline = JSON.parse(localStorage.getItem("sv_reports_offline") || "[]");
      if (Array.isArray(offline) && offline.length) {
        const offlineReports: Report[] = offline.map((item: any) => ({
          reportId: item.id,
          title: item.title,
          category: item.category,
          status: "受付",
          assigneeName: null,
          riskScore: 0,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.createdAt || new Date().toISOString(),
          body: item.body || ""
        }));
        setReports((prev) => [...offlineReports, ...prev]);
      }
    } catch (err) {
      console.warn("failed to parse offline reports", err);
    }
  }, [initialReports]);

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const statusOk = filterStatus === "all" || report.status === filterStatus;
      const categoryOk = filterCategory === "all" || (report.category ?? "") === filterCategory;
      const searchOk =
        search.trim() === "" || report.title.toLowerCase().includes(search.trim().toLowerCase());
      return statusOk && categoryOk && searchOk;
    });
  }, [reports, filterStatus, filterCategory, search]);

  const summary = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => r.status === "受付").length;
    const investigate = reports.filter((r) => r.status === "調査").length;
    const progress = reports.filter((r) => r.status === "対応中").length;
    const done = reports.filter((r) => r.status === "完了").length;
    return { total, open, investigate, progress, done };
  }, [reports]);

  const handleUpdate = async (report: Report) => {
    const statusInput = prompt("ステータスを入力（受付/調査/対応中/完了）", report.status) || report.status;
    const allowed = ["受付", "調査", "対応中", "完了"];
    if (!allowed.includes(statusInput)) {
      alert("無効なステータスです。");
      return;
    }
    const assigneeName = prompt("担当者名を入力（任意）", report.assigneeName || "") || "";
    const riskValue = prompt("リスクスコア(0-100)", String(report.riskScore)) || String(report.riskScore);
    const riskScore = Number(riskValue);

    const payload: Record<string, unknown> = {
      status: statusInput,
      assigneeName: assigneeName.trim() || null
    };
    if (!Number.isNaN(riskScore)) {
      payload.riskScore = Math.min(Math.max(Math.round(riskScore), 0), 100);
    }

    try {
      const res = await fetch(`${API_BASE}/reports/${report.reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      if (!res.ok) throw new Error(`unexpected status ${res.status}`);
      const updated = await res.json();
      setReports((prev) => prev.map((r) => (r.reportId === report.reportId ? updated : r)));
      setMessage("通報を更新しました。");
    } catch (err) {
      console.error(err);
      setMessage("APIに接続できませんでした。後で再試行してください。");
    }
  };

  const handleDelete = async (report: Report) => {
    if (!confirm("この通報を削除しますか？")) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${report.reportId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error(`unexpected status ${res.status}`);
      setReports((prev) => prev.filter((r) => r.reportId !== report.reportId));
      setMessage("通報を削除しました。");
    } catch (err) {
      console.error(err);
      setMessage("削除に失敗しました。ネットワークを確認してください。");
    }
  };

  return (
    <>
      <div className="row">
      <div className="chips" id="summaryChips">
        <span className="badge">総件数: {summary.total}</span>
        <span className="badge">受付: {summary.open}</span>
        <span className="badge">調査: {summary.investigate}</span>
        <span className="badge">対応中: {summary.progress}</span>
        <span className="badge">完了: {summary.done}</span>
      </div>
        <div className="row__right filters">
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">全カテゴリ</option>
            <option>コンプライアンス違反</option>
            <option>ハラスメント</option>
            <option>労働環境</option>
            <option>その他</option>
          </select>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">全ステータス</option>
            <option>受付</option>
            <option>調査</option>
            <option>対応中</option>
            <option>完了</option>
          </select>
        </div>
      </div>

      <div className="search" style={{ marginBottom: 16 }}>
        <span className="search__icon" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          placeholder="件名で検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {message && <p className="muted">{message}</p>}

      <div className="db-grid" id="cards">
        {filtered.map((report) => (
          <article className="db-card" key={report.reportId}>
            <div className="db-card__title">{report.title}</div>
            <div className="db-card__meta">
              カテゴリ: {report.category ?? "未設定"} / 日時: {new Date(report.createdAt).toLocaleString("ja-JP")}
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="badge">ステータス: {report.status}</span>
              <span className="badge">担当: {report.assigneeName || "未設定"}</span>
              <span className="badge">リスク: {report.riskScore}</span>
              <div className="row__right card-actions">
                <button className="ghost" type="button" onClick={() => handleUpdate(report)}>
                  担当/進捗
                </button>
                <button className="ghost" type="button" onClick={() => handleDelete(report)}>
                  削除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && <p className="muted">該当する通報はありません。</p>}
    </>
  );
}
