
-- Silent Voice MVP Schema (PostgreSQL)
-- Version: Day1 fixed schema proposal
-- Notes:
-- - Single-tenant default via constant UUID on tenant_id columns.
-- - Application-level encryption recommended for 'body_encrypted' (binary ciphertext).
-- - Do NOT store IP/UA to preserve anonymity.

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- ---------- Helper: updated_at trigger ----------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- reports (通報本体) ----------
CREATE TABLE IF NOT EXISTS reports (
  report_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  title         text NOT NULL,
  body_encrypted bytea NOT NULL,                -- 暗号化済み本文（アプリ側で暗号化）
  status        text NOT NULL CHECK (status IN ('received','investigating','in_progress','resolved')),
  risk_score    numeric(5,2),                   -- 0.00–100.00 程度を想定（任意）
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant_status ON reports (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_tenant_created ON reports (tenant_id, created_at DESC);

CREATE TRIGGER reports_set_timestamp
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ---------- report_files (添付ファイル) ----------
CREATE TABLE IF NOT EXISTS report_files (
  file_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  storage_url text NOT NULL,                    -- S3 等の保存先（署名 URL でDL）
  checksum    text NOT NULL,                    -- 整合性確認（例：SHA256 hex）
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_files_report_id ON report_files (report_id);

-- ---------- users (利用ユーザー) ----------
CREATE TABLE IF NOT EXISTS users (
  user_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  role        text NOT NULL CHECK (role IN ('compliance','investigator','admin')), -- MVP想定
  email_hash  text,                             -- 平文メールは保存しない（SHA-256等のハッシュ）
  mfa_secret  text,                             -- TOTPなど（暗号化推奨）
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role);

CREATE TRIGGER users_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ---------- audit_logs (監査ログ) ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  actor_id   uuid,                               -- 実行者（NULL可：匿名/システム）
  action     text NOT NULL,                      -- 例：'REPORT_CREATED','STATUS_CHANGED'
  report_id  uuid,                               -- 関連通報（任意）
  details    jsonb NOT NULL DEFAULT '{}'::jsonb, -- 変更差分など（PII含めない）
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_report_id ON audit_logs (report_id);
CREATE INDEX IF NOT EXISTS idx_logs_actor_id ON audit_logs (actor_id);

-- ---------- Seed / Guidance ----------
-- スモール版：全レコードの tenant_id は固定UUIDを使用（上記デフォルト）。
-- 一般公開版への拡張時：
--  1) 固定UUIDを削除し、実テナントUUIDを付与（LiquibaseでALTER）。
--  2) ステータスはテーブル化 or マスタ化（将来のカスタムステージ対応）。
--  3) users.role はRBACテーブルへ拡張（roles, user_roles, permissions）。

-- ---------- Export Helpers (任意) ----------
-- 監査CSV用のビュー例（必要に応じて利用）
CREATE OR REPLACE VIEW v_audit_export AS
SELECT
  log_id,
  tenant_id,
  actor_id,
  action,
  report_id,
  to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_utc,
  details
FROM audit_logs;
