import { AccountStatus, Prisma, TradeStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { getRateConfig } from "./rateConfig";

export const ACTIVE_TRADE_STATUSES: TradeStatus[] = [
  "PENDING",
  "PROCESSING",
  "INFO_REQUESTED",
  "APPROVED",
];

export interface UserRestriction {
  blocked: boolean;
  reason?: string;
  accountStatus: AccountStatus;
  suspendedUntil?: Date | null;
}

export async function refreshExpiredSuspension(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus !== "SUSPENDED" || !user.suspendedUntil) return;
  if (user.suspendedUntil > new Date()) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
      suspendedUntil: null,
      suspensionReason: null,
    },
  });
  await prisma.userModerationEvent.create({
    data: {
      userId,
      action: "AUTO_UNSUSPEND",
      reason: "Temporary suspension expired",
    },
  });
}

export async function getUserTradeLimit(userId: string): Promise<number> {
  const [user, config] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { maxConcurrentTrades: true } }),
    getRateConfig(),
  ]);
  return user?.maxConcurrentTrades ?? config.defaultMaxConcurrentTrades;
}

export async function countActiveTrades(userId: string): Promise<number> {
  return prisma.trade.count({
    where: { userId, status: { in: ACTIVE_TRADE_STATUSES } },
  });
}

export async function countRecentRejections(userId: string, windowDays: number): Promise<number> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return prisma.trade.count({
    where: { userId, status: "REJECTED", updatedAt: { gte: since } },
  });
}

export async function getUserRestriction(userId: string): Promise<UserRestriction> {
  await refreshExpiredSuspension(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { blocked: true, reason: "User not found", accountStatus: "BANNED" };

  if (user.accountStatus === "BANNED") {
    return {
      blocked: true,
      reason: user.suspensionReason || "This account has been banned.",
      accountStatus: user.accountStatus,
      suspendedUntil: user.suspendedUntil,
    };
  }

  if (user.accountStatus === "SUSPENDED") {
    const until = user.suspendedUntil;
    if (!until || until > new Date()) {
      const untilText = until ? ` until ${until.toLocaleString()}` : "";
      return {
        blocked: true,
        reason: user.suspensionReason || `Account suspended${untilText}.`,
        accountStatus: user.accountStatus,
        suspendedUntil: until,
      };
    }
  }

  return { blocked: false, accountStatus: user.accountStatus, suspendedUntil: user.suspendedUntil };
}

export async function assertUserCanTrade(userId: string): Promise<void> {
  const restriction = await getUserRestriction(userId);
  if (restriction.blocked) {
    throw new Error(restriction.reason || "Account restricted");
  }

  const [limit, active] = await Promise.all([getUserTradeLimit(userId), countActiveTrades(userId)]);
  if (active >= limit) {
    throw new Error(`Trade limit reached (${active}/${limit} active trades). Wait for existing trades to complete.`);
  }
}

export async function logModerationEvent(params: {
  userId: string;
  adminId?: string;
  action: string;
  reason?: string;
  suspendedUntil?: Date | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.userModerationEvent.create({
    data: {
      userId: params.userId,
      adminId: params.adminId,
      action: params.action,
      reason: params.reason,
      suspendedUntil: params.suspendedUntil ?? undefined,
      metadata: params.metadata,
    },
  });
}

export type ModerationAction = "ban" | "suspend" | "unsuspend" | "lift_ban" | "set_limits";

export async function applyUserModeration(
  userId: string,
  action: ModerationAction,
  options: {
    adminId?: string;
    reason?: string;
    suspendDays?: number;
    maxConcurrentTrades?: number | null;
    adminNotes?: string | null;
  } = {}
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN" && (action === "ban" || action === "suspend")) {
    throw new Error("Cannot ban or suspend an admin account");
  }

  const patch: Prisma.UserUpdateInput = {};
  let eventAction = action.toUpperCase();
  let suspendedUntil: Date | null | undefined;

  if (action === "ban") {
    patch.accountStatus = "BANNED";
    patch.suspendedUntil = null;
    patch.suspensionReason = options.reason?.trim() || "Banned by administrator";
    eventAction = "BAN";
  } else if (action === "suspend") {
    const days = options.suspendDays ?? 7;
    suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    patch.accountStatus = "SUSPENDED";
    patch.suspendedUntil = suspendedUntil;
    patch.suspensionReason = options.reason?.trim() || `Suspended for ${days} day(s)`;
    eventAction = "SUSPEND";
  } else if (action === "unsuspend" || action === "lift_ban") {
    patch.accountStatus = "ACTIVE";
    patch.suspendedUntil = null;
    patch.suspensionReason = null;
    eventAction = action === "lift_ban" ? "LIFT_BAN" : "UNSUSPEND";
  } else if (action === "set_limits") {
    if (options.maxConcurrentTrades !== undefined) {
      patch.maxConcurrentTrades = options.maxConcurrentTrades;
    }
    if (options.adminNotes !== undefined) patch.adminNotes = options.adminNotes;
    eventAction = "SET_LIMITS";
  }

  await prisma.user.update({ where: { id: userId }, data: patch });
  await logModerationEvent({
    userId,
    adminId: options.adminId,
    action: eventAction,
    reason: options.reason,
    suspendedUntil,
    metadata:
      options.maxConcurrentTrades != null
        ? { maxConcurrentTrades: options.maxConcurrentTrades }
        : undefined,
  });
}

/** Auto-suspend when recent rejections exceed platform threshold. */
export async function maybeAutoSuspendForRejections(userId: string): Promise<boolean> {
  const config = await getRateConfig();
  if (config.autoSuspendRejectThreshold <= 0) return false;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "ADMIN" || user.accountStatus !== "ACTIVE") return false;

  const recent = await countRecentRejections(userId, config.autoSuspendRejectWindowDays);
  if (recent < config.autoSuspendRejectThreshold) return false;

  const suspendedUntil = new Date(Date.now() + config.autoSuspendDurationDays * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "SUSPENDED",
      suspendedUntil,
      suspensionReason: `Auto-suspended after ${recent} rejected trades in ${config.autoSuspendRejectWindowDays} days`,
    },
  });
  await logModerationEvent({
    userId,
    action: "AUTO_SUSPEND",
    reason: `Auto-suspended after ${recent} rejected trades in ${config.autoSuspendRejectWindowDays} days`,
    suspendedUntil,
    metadata: { recentRejections: recent },
  });
  return true;
}

export async function getUserModerationSummary(userId: string) {
  await refreshExpiredSuspension(userId);
  const config = await getRateConfig();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const [activeTrades, recentRejections, totalTrades, events] = await Promise.all([
    countActiveTrades(userId),
    countRecentRejections(userId, config.autoSuspendRejectWindowDays),
    prisma.trade.count({ where: { userId } }),
    prisma.userModerationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { admin: { select: { id: true, email: true, displayName: true } } },
    }),
  ]);

  const tradeLimit = user.maxConcurrentTrades ?? config.defaultMaxConcurrentTrades;

  return {
    user,
    activeTrades,
    tradeLimit,
    recentRejections,
    totalTrades,
    autoSuspendThreshold: config.autoSuspendRejectThreshold,
    autoSuspendWindowDays: config.autoSuspendRejectWindowDays,
    events,
  };
}
