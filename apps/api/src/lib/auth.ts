import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../env";
import { prisma } from "../prisma";
import { getUserRestriction } from "../services/userModeration";

export interface JwtPayload {
  sub: string;
  role: "USER" | "ADMIN";
  /** Unix seconds; tokens issued before the latest password change are rejected. */
  pwdAt?: number;
}

export function passwordTokenVersion(user: { passwordChangedAt?: Date | null }): number {
  return user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : 0;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(user: { id: string; role: "USER" | "ADMIN"; passwordChangedAt?: Date | null }): string {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    pwdAt: passwordTokenVersion(user),
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "USER" | "ADMIN";
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const currentPwdAt = passwordTokenVersion(user);
    const tokenPwdAt = decoded.pwdAt ?? 0;
    if (tokenPwdAt < currentPwdAt) {
      return res.status(401).json({ error: "Session expired — please sign in again" });
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function requireVerified() {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.emailVerified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }
    next();
  };
}

export function requireActiveAccount() {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const restriction = await getUserRestriction(req.userId!);
      if (restriction.blocked) {
        return res.status(403).json({ error: restriction.reason || "Account restricted" });
      }
      next();
    } catch {
      return res.status(403).json({ error: "Account restricted" });
    }
  };
}
