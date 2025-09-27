export default function HomePage() {
  return (
    <section className="page is-active" aria-label="トップ">
      <nav className="breadcrumbs">
        <span aria-current="page">トップ</span>
      </nav>
      <h1 className="page-title">社員の声が、企業の未来を守る</h1>
      <div className="page-meta">サイレントボイス — 匿名通報プラットフォーム</div>

      <section className="callout" role="note" aria-label="概要">
        <div className="callout__icon">💡</div>
        <div className="callout__body">
          匿名で通報を受け付け、担当が受付→重大度判定→対応策記録→PDF共有。すべての操作は監査ログに残ります。
        </div>
      </section>

      <details className="toggle" open>
        <summary>使い方（クイック）</summary>
        <div className="toggle__content">
          <ol className="numbers">
            <li>左メニュー「通報フォーム」で入力→送信（API + IndexedDBオフラインバックアップ）</li>
            <li>「ダッシュボード」で一覧・検索・担当/ステータス更新</li>
            <li>「ケースフロー」で1件の流れをPDF出力</li>
          </ol>
        </div>
      </details>
    </section>
  );
}
