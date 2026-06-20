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
import { sendTransactionalEmail } from "../services/email";
import { getUserRestriction } from "../services/userModeration";
import { authLimiter } from "../lib/rateLimit";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2).max(40).optional(),
  referralCode: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy" }),
  }),
});

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return generateReferralCode() + Date.now().toString(36).toUpperCase();
}

async function sendVerifyEmail(email: string, verifyUrl: string): Promise<void> {
  await sendTransactionalEmail(email, "Verify your email address", {
    title: "Confirm your email",
    preheader: "Verify your email to start selling gift cards on GiftCard4Sale.",
    paragraphs: [
      "Welcome to GiftCard4Sale! Please verify your email address to submit trades and withdraw payouts.",
      "This verification link expires in 24 hours.",
    ],
    ctaLabel: "Verify email address",
    ctaHref: verifyUrl,
    securityNote: "If you did not create this account, you can ignore this email.",
  });
}

async function sendPasswordChangedEmail(email: string): Promise<void> {
  await sendTransactionalEmail(email, "Your password was changed", {
    title: "Password changed",
    preheader: "Your GiftCard4Sale password was updated.",
    paragraphs: [
      "Your account password was changed successfully.",
      "If you did not make this change, reset your password immediately and contact support.",
    ],
    ctaLabel: "Open GiftCard4Sale",
    ctaHref: `${env.webUrl}/login`,
    securityNote: "GiftCard4Sale will never ask for your password by email or chat.",
  });
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
    await sendVerifyEmail(email, verifyUrl);

    const token = signToken(user);
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

    await sendTransactionalEmail(user.email, "Welcome to GiftCard4Sale", {
      title: "You're all set",
      preheader: "Your email is verified. You can now sell gift cards on GiftCard4Sale.",
      paragraphs: [
        "Thanks for verifying your email address.",
        "You can browse rates, submit trades, and withdraw to USDT, Naira, or Cedi from your dashboard.",
        "Only submit gift cards you legally own, with accurate photos and denominations.",
      ],
      ctaLabel: "Go to dashboard",
      ctaHref: `${env.webUrl}/dashboard`,
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
    await sendVerifyEmail(user.email, verifyUrl);
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
    const restriction = await getUserRestriction(user.id);
    if (restriction.blocked) {
      return res.status(403).json({ error: restriction.reason || "Account restricted" });
    }
    const token = signToken(user);
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
      await sendTransactionalEmail(user.email, "Reset your password", {
        title: "Reset your password",
        preheader: "Use this link to choose a new GiftCard4Sale password.",
        paragraphs: [
          "We received a request to reset your password.",
          "This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.",
        ],
        ctaLabel: "Reset password",
        ctaHref: url,
        securityNote: "Never share this link with anyone.",
      });
    }
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
        passwordChangedAt: new Date(),
      },
    });
    await sendPasswordChangedEmail(user.email);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  authLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = validate(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }),
      req.body
    );
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
      },
    });
    await sendPasswordChangedEmail(user.email);
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
    accountStatus: u.accountStatus ?? "ACTIVE",
    suspendedUntil: u.suspendedUntil ?? null,
    suspensionReason: u.suspensionReason ?? null,
    maxConcurrentTrades: u.maxConcurrentTrades ?? null,
    adminNotes: u.adminNotes ?? null,
    createdAt: u.createdAt,
  };
}

export function adminUserListItem(
  u: any,
  stats?: { activeTrades: number; recentRejections: number; tradeLimit: number }
) {
  return {
    ...publicUser(u),
    activeTrades: stats?.activeTrades ?? 0,
    recentRejections: stats?.recentRejections ?? 0,
    tradeLimit: stats?.tradeLimit ?? null,
  };
}
