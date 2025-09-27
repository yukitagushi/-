import AuthPanel from "./AuthPanel";

export default function AuthPage() {
  return (
    <section className="page" aria-label="ログイン">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">ログイン</span>
      </nav>
      <h1 className="page-title">メール + ワンタイムコード認証</h1>
      <div className="page-meta">社内メールアドレスを入力すると6桁コードを送信します。</div>
      <AuthPanel />
    </section>
  );
}
