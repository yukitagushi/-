"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StatusState = "idle" | "saving" | "success" | "error" | "offline";

const OFFLINE_KEY = "sv_reports_offline";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function ReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("労働環境");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<StatusState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const draftsEnabled = process.env.NEXT_PUBLIC_DRAFTS_ENABLED !== "false";

  const disabled = useMemo(() => {
    return !title.trim() || !body.trim();
  }, [title, body]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    setError(null);
    setStatus("saving");

    const payload = {
      title: title.trim(),
      category,
      body: body.trim()
    };

    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }

      setStatus("success");
      setTitle("");
      setBody("");
      setDraftMessage(null);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      retainOffline(payload);
      setStatus("offline");
      setError("API未接続のため通報をローカル保存しました。接続後に同期してください。");
    }
  };

  const handleDraft = async () => {
    if (!title.trim() && !body.trim()) {
      setDraftMessage("件名または本文を入力してから下書きを生成してください。");
      return;
    }
    setDraftLoading(true);
    setDraftMessage(null);
    try {
      const res = await fetch(`${API_BASE}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "無題の通報",
          body: body.trim() || title.trim()
        }),
        credentials: "include"
      });
      if (!res.ok) throw new Error(`draft failed ${res.status}`);
      const data = await res.json();
      setBody(data.draft || body);
      setDraftMessage(
        data.mode === "live"
          ? "AI下書きを本文に挿入しました。必要に応じて編集してください。"
          : "サンプル下書きを本文に挿入しました。"
      );
    } catch (err) {
      console.error(err);
      setDraftMessage("下書き生成に失敗しました。後で再試行してください。");
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="reportTitle">件名</label>
        <input
          id="reportTitle"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例：部署内での長時間残業"
        />
      </div>

      <div className="field">
        <label htmlFor="reportCategory">カテゴリ</label>
        <select
          id="reportCategory"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>コンプライアンス違反</option>
          <option>ハラスメント</option>
          <option>労働環境</option>
          <option>その他</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="reportBody">内容</label>
        {draftsEnabled && (
          <div className="actions" style={{ marginBottom: 8 }}>
            <button
              className="ghost"
              type="button"
              onClick={handleDraft}
              disabled={draftLoading}
            >
              {draftLoading ? "AI下書き生成中…" : "AI下書きを生成"}
            </button>
          </div>
        )}
        <textarea
          id="reportBody"
          name="body"
          required
          minLength={10}
          rows={8}
          placeholder="状況をできる限り具体的に記載してください"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      <div className="actions">
        <button className="primary" type="submit" disabled={disabled || status === "saving"}>
          {status === "saving" ? "送信中…" : "匿名で送信"}
        </button>
        <span className="muted">入力内容は暗号化されAPIに送信されます。</span>
      </div>

      {status === "success" && (
        <p role="status" className="muted">
          受付しました。担当者が確認します。
        </p>
      )}
      {status === "offline" && (
        <p role="alert" className="muted">
          {error}
        </p>
      )}
      {status === "error" && error && (
        <p role="alert" className="muted">
          {error}
        </p>
      )}
      {draftMessage && draftsEnabled && <p className="muted">{draftMessage}</p>}
    </form>
  );
}

function retainOffline(payload: { title: string; category: string; body: string }) {
  try {
    const list = JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]");
    list.push({
      ...payload,
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("failed to retain offline report", err);
  }
}
