"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type SessionUser = {
  userId: string;
  email: string;
  role: string;
};

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"request" | "verify" | "signedIn">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/session`, {
          credentials: "include"
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          setUser({
            userId: data.user.userId,
            email: data.user.email,
            role: data.user.role
          });
          setStage("signedIn");
        }
      } catch (err) {
        console.warn(err);
      }
    })();
  }, []);

  const sendCode = async () => {
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("failed");
      setStage("verify");
      setMessage("6桁コードを送信しました。メールを確認してください。");
      setEmail(normalizedEmail);
    } catch (err) {
      console.error(err);
      setMessage("コード送信に失敗しました。接続設定を確認してください。");
    }
  };

  const verifyCode = async () => {
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setUser({
        userId: data.user.userId,
        email: data.user.email,
        role: data.user.role
      });
      setStage("signedIn");
      setMessage("ログインしました。");
      window.dispatchEvent(new Event("sv:session-changed"));
    } catch (err) {
      console.error(err);
      setMessage("コード確認に失敗しました。再入力してください。");
    }
  };

  const logout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
    setStage("request");
    setEmail("");
    setCode("");
    setMessage("ログアウトしました。");
    window.dispatchEvent(new Event("sv:session-changed"));
  };

  return (
    <div className="form" style={{ maxWidth: 420 }}>
      {stage === "request" && (
        <>
          <div className="field">
            <label htmlFor="authEmail">メールアドレス</label>
            <input
              id="authEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.co.jp"
            />
          </div>
          <div className="actions">
            <button className="primary" type="button" onClick={sendCode} disabled={!email}>
              コード送信
            </button>
          </div>
        </>
      )}

      {stage === "verify" && (
        <>
          <div className="field">
            <label htmlFor="otpCode">6桁コード</label>
            <input
              id="otpCode"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              placeholder="123456"
            />
          </div>
          <div className="actions">
            <button className="primary" type="button" onClick={verifyCode} disabled={code.length !== 6}>
              ログイン
            </button>
            <button className="ghost" type="button" onClick={sendCode}>
              再送信
            </button>
          </div>
        </>
      )}

      {stage === "signedIn" && user && (
        <div className="callout">
          <div className="callout__icon">✅</div>
          <div>
            <p>{user.email} でログイン中</p>
            <p className="muted">権限: {user.role}</p>
            <div className="actions">
              <button className="ghost" type="button" onClick={logout}>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="muted">{message}</p>}
    </div>
  );
}
