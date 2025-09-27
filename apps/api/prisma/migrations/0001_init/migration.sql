-- Prisma migration: initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('admin','compliance','viewer');
CREATE TYPE "ReportStatus" AS ENUM ('受付','調査','対応中','完了');

CREATE TABLE "tenants" (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "users" (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  role "UserRole" NOT NULL DEFAULT 'viewer',
  email TEXT,
  email_hash TEXT NOT NULL UNIQUE,
  mfa_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "otp_challenges" (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "reports" (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  category TEXT,
  body_encrypted TEXT NOT NULL,
  status "ReportStatus" NOT NULL DEFAULT '受付',
  risk_score INT NOT NULL DEFAULT 0,
  assignee_display_name TEXT,
  assignee_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "report_files" (
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "audit_logs" (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  detail TEXT,
  report_id UUID REFERENCES reports(report_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "users_tenant_idx" ON "users"(tenant_id);
CREATE UNIQUE INDEX "users_tenant_email_unique" ON "users"(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX "otp_challenges_user_idx" ON "otp_challenges"(user_id, expires_at);
CREATE INDEX "reports_tenant_created_idx" ON "reports"(tenant_id, created_at DESC);
CREATE INDEX "reports_tenant_status_idx" ON "reports"(tenant_id, status);
CREATE INDEX "report_files_report_idx" ON "report_files"(report_id, created_at DESC);
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs"(tenant_id, created_at DESC);

INSERT INTO tenants (code, name)
VALUES ('default', 'Silent Voice Default')
ON CONFLICT (code) DO NOTHING;
