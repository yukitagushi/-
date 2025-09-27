import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

const SESSION_COOKIE = "sv_session";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/send")
  send(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post("otp/verify")
  async verify(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { token, user } = await this.authService.verifyOtp(dto);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return { ok: true, user };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[SESSION_COOKIE];
    await this.authService.logout(token);
    res.clearCookie(SESSION_COOKIE);
    return { ok: true };
  }

  @Get("session")
  async session(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE];
    const session = await this.authService.getSession(token);
    return session ?? { user: null };
  }
}
