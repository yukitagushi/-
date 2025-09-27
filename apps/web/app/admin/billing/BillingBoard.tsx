"use client";

import { useState } from "react";

type Invoice = {
  invoiceId: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  amountJpy: number;
  memo?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialInvoices: Invoice[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const STATUS_OPTIONS = ["draft", "sent", "paid", "canceled"] as const;

export default function BillingBoard({ initialInvoices }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    periodFrom: "",
    periodTo: "",
    amountJpy: "",
    memo: "",
    status: "draft"
  });

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/invoices`, { credentials: "include" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      setMessage("最新の請求情報を取得できませんでした");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        customerName: form.customerName.trim(),
        periodFrom: form.periodFrom,
        periodTo: form.periodTo,
        amountJpy: Number(form.amountJpy || 0),
        memo: form.memo.trim() || undefined,
        status: form.status
      };
      const res = await fetch(`${API_BASE}/billing/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setForm({ customerName: "", periodFrom: "", periodTo: "", amountJpy: "", memo: "", status: "draft" });
      setMessage("請求書を作成しました");
      await refresh();
    } catch (err) {
      console.error(err);
      setMessage("請求書の作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (invoice: Invoice) => {
    const next = prompt("ステータスを入力 (draft/sent/paid/canceled)", invoice.status) || invoice.status;
    if (!STATUS_OPTIONS.includes(next as (typeof STATUS_OPTIONS)[number])) {
      alert("無効なステータスです");
      return;
    }
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/billing/invoices/${invoice.invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setMessage("ステータスを更新しました");
      await refresh();
    } catch (err) {
      console.error(err);
      setMessage("ステータス更新に失敗しました");
    }
  };

  return (
    <div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <form className="form" onSubmit={handleSubmit} style={{ flex: 1 }}>
          <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
            <div className="field" style={{ minWidth: 220, flex: "1 1 220px" }}>
              <label>顧客名</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                placeholder="例：Acme Corp"
                required
              />
            </div>
            <div className="field">
              <label>請求期間(自)</label>
              <input
                type="date"
                value={form.periodFrom}
                onChange={(e) => setForm((prev) => ({ ...prev, periodFrom: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>請求期間(至)</label>
              <input
                type="date"
                value={form.periodTo}
                onChange={(e) => setForm((prev) => ({ ...prev, periodTo: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>金額 (JPY)</label>
              <input
                type="number"
                min={0}
                value={form.amountJpy}
                onChange={(e) => setForm((prev) => ({ ...prev, amountJpy: e.target.value }))}
                required
              />
            </div>
            <div className="field" style={{ minWidth: 220, flex: "1 1 220px" }}>
              <label>メモ</label>
              <input
                value={form.memo}
                onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="任意：送付先や備考"
              />
            </div>
            <div className="field">
              <label>ステータス</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="actions" style={{ alignSelf: "center" }}>
              <button className="primary" type="submit" disabled={loading}>
                {loading ? "登録中…" : "請求書を登録"}
              </button>
            </div>
          </div>
        </form>
        <div className="row__right" style={{ display: "flex", gap: 12 }}>
          <a className="ghost" href={`${API_BASE}/billing/invoices.csv`} target="_blank" rel="noopener">
            CSVエクスポート
          </a>
          <button className="ghost" type="button" onClick={refresh}>
            再読込
          </button>
        </div>
      </div>

      {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ marginTop: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={cellHead}>顧客名</th>
              <th style={cellHead}>期間</th>
              <th style={cellHead}>金額</th>
              <th style={cellHead}>ステータス</th>
              <th style={cellHead}>更新</th>
              <th style={cellHead}>操作</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoiceId}>
                <td style={cellBody}>{invoice.customerName}</td>
                <td style={cellBody}>
                  {invoice.periodFrom} 〜 {invoice.periodTo}
                </td>
                <td style={cellBody}>{invoice.amountJpy.toLocaleString()} 円</td>
                <td style={cellBody}>
                  <span className="badge">{invoice.status}</span>
                </td>
                <td style={cellBody}>{new Date(invoice.updatedAt).toLocaleString("ja-JP")}</td>
                <td style={cellBody}>
                  <button className="ghost" type="button" onClick={() => handleStatus(invoice)}>
                    ステータス更新
                  </button>
                </td>
              </tr>
            ))}
            {!invoices.length && (
              <tr>
                <td style={cellBody} colSpan={6}>
                  請求データはまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellHead: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
  padding: "10px 12px",
  background: "var(--bg-soft)"
};

const cellBody: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "10px 12px",
  whiteSpace: "nowrap"
};
