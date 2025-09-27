import { PrismaClient, ReportStatus } from "@prisma/client";
import { createHash } from "crypto";

function hashEmail(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function encodeBody(plain: string) {
  return Buffer.from(plain, "utf8").toString("base64");
}

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const tenant = await prisma.tenant.upsert({
    where: { code: "default" },
    update: {},
    create: { code: "default", name: "Silent Voice" }
  });

  const adminEmail = "admin@example.com";
  const admin = await prisma.user.upsert({
    where: { emailHash: hashEmail(adminEmail) },
    update: { email: adminEmail, role: "admin" },
    create: {
      tenantId: tenant.tenantId,
      email: adminEmail,
      emailHash: hashEmail(adminEmail),
      role: "admin"
    }
  });

  const existing = await prisma.report.count({ where: { tenantId: tenant.tenantId } });
  if (existing === 0) {
    await prisma.report.createMany({
      data: [
        {
          tenantId: tenant.tenantId,
          title: "サンプル通報1",
          category: "労働環境",
          bodyEncrypted: encodeBody("試験用の通報本文です。"),
          status: ReportStatus.受付,
          riskScore: 20,
          assigneeName: "コンプラ担当A"
        },
        {
          tenantId: tenant.tenantId,
          title: "サンプル通報2",
          category: "コンプライアンス違反",
          bodyEncrypted: encodeBody("業務プロセス改善に関する通報です。"),
          status: ReportStatus.対応中,
          riskScore: 60,
          assigneeName: "法務B"
        }
      ]
    });
  }

  const invoiceCount = await prisma.invoice.count({ where: { tenantId: tenant.tenantId } });
  if (invoiceCount === 0) {
    await prisma.invoice.createMany({
      data: [
        {
          tenantId: tenant.tenantId,
          customerName: "Acme Corp",
          periodFrom: new Date("2024-01-01"),
          periodTo: new Date("2024-01-31"),
          amountJpy: 320000,
          memo: "1月利用分",
          status: "sent"
        },
        {
          tenantId: tenant.tenantId,
          customerName: "Beta LLC",
          periodFrom: new Date("2024-02-01"),
          periodTo: new Date("2024-02-29"),
          amountJpy: 180000,
          memo: "2月利用分（スポット対応含む）",
          status: "draft"
        }
      ]
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.tenantId,
      actorId: admin.userId,
      action: "seed.run",
      detail: "Seed data inserted",
      targetId: admin.userId
    }
  });

  await prisma.$disconnect();
  // eslint-disable-next-line no-console
  console.log("Seed completed");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
