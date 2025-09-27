# Silent Voice Platform

Next.js + NestJS monorepo that reuses the existing Silent Voice SPA look & feel while wiring it to a PostgreSQL backend. The repository is organised as npm workspaces:

- `apps/web` – Next.js (App Router, SSR) port of the original Notion-style UI
- `apps/api` – NestJS REST API with Prisma + PostgreSQL
- `packages/ui` – shared CSS tokens and layout components migrated from `assets/`

## Environment setup

Create three environment files before running anything locally:

```bash
cp .env.example .env           # repository root (shared secrets)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill in the provided variables as needed:

- `DATABASE_URL` already points at the shared Supabase instance. Replace the hostname/credentials when moving to production RDS (remember `sslmode=require`).
- `OPENAI_API_KEY` enables live GPT-4o drafts. Leave blank for the built-in dry-run response.
- `S3_BUCKET` + AWS credentials enable real pre-signed URLs; without them the API serves deterministic dummy URLs for testing.
- `OTP_MAIL_MODE` governs OTP delivery (`dryrun`, `smtp`, `ses`). Configure the related SMTP/SES settings when upgrading from dry run.
- `NEXT_PUBLIC_DRAFTS_ENABLED` (web) lets you hide the AI button if policy requires manual drafting.

## Quick start

1. Boot the stack once env files are in place:
   ```bash
   docker-compose up --build
   ```
   - Web: http://localhost:3000
   - API: http://localhost:4000 (health check at `/health`)
   - Postgres: localhost:5432 (`silent_voice` / `silent_voice`)

2. (Optional) Seed sample data in a separate shell:
   ```bash
   docker-compose run --rm api npm run seed --workspace apps/api
   ```

When Docker starts the API container it automatically applies Prisma migrations (`apps/api/prisma/migrations/`) to align the schema with the `tenants`, `users`, `reports`, `report_files`, and `audit_logs` tables.

## Environment variables

- `DATABASE_URL` – PostgreSQL connection string (swap host/user/pass for RDS; keep `sslmode=require`).
- `SESSION_SECRET` – HMAC secret for OTP sessions.
- `OTP_MAIL_MODE` – `dryrun`, `smtp`, or `ses`.
  - For SMTP provide `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
  - For SES provide `SES_REGION` and ensure IAM credentials are available in the container.
- `NOTIFY_MAIL_FROM` / `NOTIFY_MAIL_TO` – sender/recipient for new report notifications.
- `UPLOAD_PRESIGN_BASE`, `STORAGE_BASE_URL` – placeholders returned by the `/files/presign` endpoint (replace with S3 later).
- `NEXT_PUBLIC_API_BASE_URL` – consumed by the Next.js client for API calls.

## API surface (NestJS)

- `GET /health` – service probe
- `POST /auth/otp/send` – send OTP (dry-run logs when `OTP_MAIL_MODE=dryrun`)
- `POST /auth/otp/verify` – verify OTP, issues cookie session
- `POST /auth/logout` – revoke session + audit
- `GET /auth/session` – return current session user
- `GET /reports` – list reports (filter with `status` / `category`)
- `GET /reports/:id` – fetch single report with decrypted `body`
- `POST /reports` – create report (stores encrypted body, triggers audit + optional email)
- `PUT /reports/:id` – update status / assignee / risk score
- `DELETE /reports/:id` – remove report
- `POST /files/presign` – return dummy presigned upload URL (S3 integration placeholder)
- `GET /audit` – recent audit trail
- `POST /audit` – append audit entry (used client-side for flow open tracking)
- `POST /drafts` – generate a GPT-4o summary. Falls back to a deterministic sample when `OPENAI_API_KEY` is unset.

## Manual QA checklist

1. **通報フロー** – `/report` で送信（必要に応じて「AI下書きを生成」で本文を自動挿入）→ `/dashboard` に即反映 → ステータス/担当/リスク更新 → `/audit` に履歴が残り CSV ダウンロードできる。 
2. **ケースフロー** – `/flow` で対象を選択し PDF 印刷ダイアログが開く（選択ごとに `flow.open` が監査に記録される）。
3. **認証** – `/auth` でメール→OTP。`OTP_MAIL_MODE=dryrun` ならコンソールにコードが表示され、画面上は成功扱い（監査ログ `auth.login`）。`logout` でセッションが破棄され `auth.logout` が記録。
4. **通知** – `NOTIFY_MAIL_TO` を設定した状態で通報を送るとメール送信か DryRun ログが発生。
5. **Docker** – `docker-compose up --build` 後、`http://localhost:4000/health` が 200 を返すこと。

## Deploying against Amazon RDS (Single-AZ)

1. Provision the RDS instance and collect host/user/password.
2. Update `.env` `DATABASE_URL` to point to the RDS endpoint (`sslmode=require`).
3. Run migrations once: `npm run prisma:migrate --workspace apps/api` from within a container/CI job.
4. Drop the Docker `postgres` service from production compose/manifest and point the API task definition at the managed RDS credentials (e.g., via AWS Secrets Manager).

Static assets continue to use the shared CSS tokens from `packages/ui`, preserving the original Notion-style visual design.

## GitHub Actions & Secrets

Two workflows (`web.yml`, `api.yml`) compile, lint, build container images, push to ECR, and refresh the ECS services. Register the following repository secrets before enabling deployments:

- `AWS_DEPLOY_ACCESS_KEY_ID`, `AWS_DEPLOY_SECRET_ACCESS_KEY`, `AWS_REGION`
- `WEB_ECR_URI`, `WEB_ECS_CLUSTER`, `WEB_ECS_SERVICE`
- `API_ECR_URI`, `API_ECS_CLUSTER`, `API_ECS_SERVICE`
- `OPENAI_API_KEY`, `DATABASE_URL` (optional for build-time tests)

Each workflow tags the image with the commit SHA (and `latest` optionally). Modify the job matrices if you need distinct staging/production services.

## Troubleshooting

| Symptom | Checks |
|---------|--------|
| API returns 500 / Prisma errors | Confirm `DATABASE_URL` (and for RDS ensure `sslmode=require`). Run `npm run prisma:migrate --workspace apps/api` to catch schema drift. |
| CORS errors from the web app | Verify `WEB_ORIGIN` / `API_ORIGIN` in `.env` and the `WEB_ORIGIN` environment of the API container. |
| OTP emails not delivered | When `OTP_MAIL_MODE=dryrun` check API logs. For `smtp`/`ses`, ensure SMTP/SES credentials and `SES_FROM` are defined. |
| GPT drafts fail | Set `OPENAI_API_KEY` and confirm outbound network access. The UI will fall back to a deterministic sample message otherwise. |
| File uploads fail | Provide `S3_BUCKET`, `AWS_REGION`, and AWS credentials. Without them the API returns demo URLs that do not store objects. |

## 手動請求ワークフロー（サマリ）

1. `/admin/billing` で請求書を作成。顧客名・対象期間・金額・メモ・初期ステータス（通常 `draft`）を入力し登録。
2. PDF化が必要な場合は `docs/billing/templates/` のテンプレートへ転記し、送付用メール文面（同ディレクトリ）を利用。送付後ステータスを `sent` に更新しメモへ記載。
3. 入金を確認したらステータスを `paid` に変更し、入金日・担当者をメモに追記。取消時は `canceled` に変更して理由を残す。
4. 月次締めでは「CSVエクスポート」でデータを出力し、会計担当へ共有（`docs/billing/exports/` に保管）。
5. 詳細な運用メモは `docs/billing/manual.md` を参照。
