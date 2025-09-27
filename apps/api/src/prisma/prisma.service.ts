import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const DEFAULT_TENANT_CODE = process.env.TENANT_CODE || "default";
const DEFAULT_TENANT_NAME = process.env.TENANT_NAME || "Silent Voice";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private tenantId: string | null = null;

  async onModuleInit() {
    await this.$connect();
    await this.ensureDefaultTenant();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async ensureDefaultTenant() {
    const tenant = await this.tenant.upsert({
      where: { code: DEFAULT_TENANT_CODE },
      update: {},
      create: {
        code: DEFAULT_TENANT_CODE,
        name: DEFAULT_TENANT_NAME
      }
    });
    this.tenantId = tenant.tenantId;
    return tenant;
  }

  getTenantId(): string {
    if (!this.tenantId) {
      throw new Error("Tenant not initialised");
    }
    return this.tenantId;
  }
}
