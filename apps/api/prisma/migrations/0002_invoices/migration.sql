CREATE TYPE "InvoiceStatus" AS ENUM ('draft','sent','paid','canceled');

CREATE TABLE "invoices" (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  amount_jpy INTEGER NOT NULL,
  memo TEXT,
  status "InvoiceStatus" NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "invoices_tenant_status_idx" ON "invoices"(tenant_id, status);
