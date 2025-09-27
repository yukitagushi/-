import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes } from "crypto";

@Injectable()
export class SessionService {
  private readonly secret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");

  sign(userId: string) {
    const issuedAt = Date.now().toString();
    const payload = `${userId}.${issuedAt}`;
    const signature = this.computeSignature(payload);
    return `${payload}.${signature}`;
  }

  verify(token?: string) {
    if (!token) throw new UnauthorizedException();
    const [userId, issuedAt, signature] = token.split(".");
    if (!userId || !issuedAt || !signature) {
      throw new UnauthorizedException();
    }
    const expected = this.computeSignature(`${userId}.${issuedAt}`);
    if (!this.timingSafeEqual(signature, expected)) {
      throw new UnauthorizedException();
    }
    return { userId, issuedAt: Number(issuedAt) };
  }

  private computeSignature(payload: string) {
    return createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  private timingSafeEqual(a: string, b: string) {
    const len = Math.max(a.length, b.length);
    let mismatch = 0;
    for (let i = 0; i < len; i += 1) {
      const charA = a.charCodeAt(i) || 0;
      const charB = b.charCodeAt(i) || 0;
      mismatch |= charA ^ charB;
    }
    return mismatch === 0;
  }
}
