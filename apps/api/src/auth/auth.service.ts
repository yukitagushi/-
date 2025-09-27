import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import otpGenerator from "otp-generator";
import * as argon2 from "argon2";
import { SessionService } from "./session.service";
import { createHash } from "crypto";

const OTP_EXPIRATION_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
    private readonly session: SessionService
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const tenantId = this.prisma.getTenantId();
    const emailHash = this.hashEmail(email);

    const user = await this.prisma.user.upsert({
      where: { emailHash },
      update: {
        email
      },
      create: {
        tenantId,
        email,
        emailHash
      }
    });

    const code = otpGenerator.generate(6, {
      alphabets: false,
      upperCase: false,
      specialChars: false,
      digits: true
    });

    const codeHash = await argon2.hash(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

    await this.prisma.otpChallenge.create({
      data: {
        userId: user.userId,
        codeHash,
        expiresAt
      }
    });

    await this.emailService.sendOtp(email, code);
    await this.audit.record({
      action: "auth.otp.send",
      actorId: null,
      detail: `email=${this.maskEmail(email)}`,
      targetId: user.userId
    });

    return { ok: true, expiresAt };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const emailHash = this.hashEmail(email);

    const user = await this.prisma.user.findUnique({ where: { emailHash } });
    if (!user) {
      throw new NotFoundException("ユーザーが見つかりません");
    }

    const otp = await this.prisma.otpChallenge.findFirst({
      where: {
        userId: user.userId,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      throw new UnauthorizedException("ワンタイムコードが期限切れです");
    }

    const isValid = await argon2.verify(otp.codeHash, dto.code);
    if (!isValid) {
      throw new UnauthorizedException("ワンタイムコードが一致しません");
    }

    await this.prisma.otpChallenge.update({
      where: { otpId: otp.otpId },
      data: { consumedAt: new Date() }
    });

    const token = this.session.sign(user.userId);

    await this.audit.record({
      action: "auth.login",
      actorId: user.userId,
      detail: `email=${this.maskEmail(email)}`,
      targetId: user.userId
    });

    return {
      token,
      user: {
        userId: user.userId,
        role: user.role,
        email
      }
    };
  }

  async getSession(token?: string) {
    if (!token) return null;
    try {
      const payload = this.session.verify(token);
      const user = await this.prisma.user.findUnique({ where: { userId: payload.userId } });
      if (!user) return null;
      return {
        user: {
          userId: user.userId,
          role: user.role,
          email: user.email ?? ""
        }
      };
    } catch {
      return null;
    }
  }

  async logout(token?: string) {
    if (!token) return;
    try {
      const payload = this.session.verify(token);
      await this.audit.record({
        action: "auth.logout",
        actorId: payload.userId,
        targetId: payload.userId
      });
    } catch (err) {
      // silent fail – session may already be invalid
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("logout session verification failed", err);
      }
    }
  }

  private hashEmail(email: string) {
    return createHash("sha256").update(email).digest("hex");
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!domain) return "***";
    const maskedName = name.length <= 2 ? `${name[0] ?? "*"}*` : `${name[0]}***${name[name.length - 1]}`;
    return `${maskedName}@${domain}`;
  }
}
