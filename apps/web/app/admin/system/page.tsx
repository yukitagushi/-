import { cookies } from "next/headers";

const API_BASE =
  process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const ENV_KEYS = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "OTP_MAIL_MODE",
  "S3_BUCKET",
  "AWS_REGION",
  "SNS_TOPIC_ARN"
];

async function fetchHealth() {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const res = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (!res.ok) throw new Error("health check failed");
    return await res.json();
  } catch (err) {
    console.warn("health fetch failed", err);
    return null;
  }
}

function mask(value: string | undefined) {
  if (!value) return "(未設定)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export default async function SystemPage() {
  const health = await fetchHealth();
  const envSummary = ENV_KEYS.map((key) => ({ key, value: mask(process.env[key]) }));

  return (
    <section className="page" aria-label="システム状態">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">システム</span>
      </nav>
      <h1 className="page-title">システムモニタリング</h1>
      <div className="page-meta">稼働確認・主要な環境変数・ログ参照リンク</div>

      <section className="callout" style={{ marginBottom: 24 }}>
        <div className="callout__icon">💡</div>
        <div>
          <div>APIヘルスチェック: {health ? "200 OK" : "NG"}</div>
          {health && <div className="muted">timestamp: {health.timestamp}</div>}
        </div>
      </section>

      <h2>主要ENVサマリ</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <tbody>
          {envSummary.map(({ key, value }) => (
            <tr key={key}>
              <td style={cellHead}>{key}</td>
              <td style={cellBody}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>運用リンク</h2>
      <ul className="action-list">
        <li>
          <a
            className="nav__item"
            style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
            href="https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/%2Fecs%2Fsilent-voice-api"
            target="_blank"
            rel="noopener"
          >
            CloudWatch Logs (API)
          </a>
        </li>
        <li>
          <a
            className="nav__item"
            style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
            href="https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/%2Fecs%2Fsilent-voice-web"
            target="_blank"
            rel="noopener"
          >
            CloudWatch Logs (Web)
          </a>
        </li>
      </ul>
    </section>
  );
}

const cellHead: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "10px 12px",
  background: "var(--bg-soft)",
  fontWeight: 600,
  width: 240
};

const cellBody: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "10px 12px"
};
