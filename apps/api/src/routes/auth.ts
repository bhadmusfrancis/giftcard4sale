import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { env } from "../env";
import { asyncHandler, validate } from "../lib/http";
import {
  hashPassword,
  verifyPassword,
  signToken,
  randomToken,
  generateReferralCode,
  requireAuth,
  AuthedRequest,
} from "../lib/auth";
import { sendEmail, layout, button } from "../services/email";
import { authLimiter } from "../lib/rateLimit";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2).max(40).optional(),
  referralCode: z.string().optional(),
});

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return generateReferralCode() + Date.now().toString(36).toUpperCase();
}

authRouter.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(registerSchema, req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    let referredById: string | null = null;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
      });
      if (referrer) referredById = referrer.id;
    }

    const verifyToken = randomToken();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(data.password),
        displayName: data.displayName || email.split("@")[0],
        referralCode: await uniqueReferralCode(),
        referredById,
        verifyToken,
        verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${env.webUrl}/verify-email?token=${verifyToken}`;
    await sendEmail(
      email,
      "Verify your email - GiftCard4Sale",
      layout(
        "Confirm your email",
        `<p>Welcome to GiftCard4Sale! Please verify your email address to start selling gift cards.</p>
         <p>${button("Verify Email", verifyUrl)}</p>
         <p style="color:#64748b;font-size:13px">This link expires in 24 hours.</p>`
      )
    );

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: publicUser(user), needsVerification: true });
  })
);

authRouter.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = validate(z.object({ token: z.string() }), req.body);
    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user || !user.verifyTokenExp || user.verifyTokenExp < new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
    });
    res.json({ ok: true });
  })
);

authRouter.post(
  "/resend-verification",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });

    const verifyToken = randomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const verifyUrl = `${env.webUrl}/verify-email?token=${verifyToken}`;
    await sendEmail(
      user.email,
      "Verify your email - GiftCard4Sale",
      layout("Confirm your email", `<p>${button("Verify Email", verifyUrl)}</p>`)
    );
    res.json({ ok: true });
  })
);

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({ email: z.string().email(), password: z.string() }),
      req.body
    );
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  })
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = validate(z.object({ email: z.string().email() }), req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const resetToken = randomToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExp: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const url = `${env.webUrl}/reset-password?token=${resetToken}`;
      await sendEmail(
        user.email,
        "Reset your password",
        layout("Reset password", `<p>${button("Reset Password", url)}</p><p>Expires in 1 hour.</p>`)
      );
    }
    // Always 200 to avoid leaking which emails exist.
    res.json({ ok: true });
  })
);

authRouter.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = validate(
      z.object({ token: z.string(), password: z.string().min(8) }),
      req.body
    );
    const user = await prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        resetToken: null,
        resetTokenExp: null,
      },
    });
    res.json({ ok: true });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(user) });
  })
);

export function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    emailVerified: u.emailVerified,
    goodScore: u.goodScore,
    badScore: u.badScore,
    trustLevel: u.trustLevel,
    referralCode: u.referralCode,
    balanceUsdt: Number(u.balanceUsdt),
    balanceNgn: Number(u.balanceNgn),
    balanceGhs: Number(u.balanceGhs),
    createdAt: u.createdAt,
  };
}
