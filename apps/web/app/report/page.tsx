import { ReportForm } from "./ReportForm";

export default function ReportPage() {
  return (
    <section className="page" aria-label="通報フォーム">
      <nav className="breadcrumbs">
        <a href="/">トップ</a>
        <span className="sep">/</span>
        <span aria-current="page">通報フォーム</span>
      </nav>
      <h1 className="page-title">匿名の社内通報</h1>
      <div className="page-meta">内容は暗号化され、担当チームのみが復号できます。</div>
      <ReportForm />
    </section>
  );
}
