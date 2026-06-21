import { prisma } from "../prisma";

export type NotificationCategory = "tradeStatus" | "tradeChat" | "withdrawal" | "referral";

export interface NotificationChannelPrefs {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

export type NotificationPreferences = Record<NotificationCategory, NotificationChannelPrefs>;

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "tradeStatus",
  "tradeChat",
  "withdrawal",
  "referral",
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  tradeStatus: { inApp: true, push: true, email: true },
  tradeChat: { inApp: true, push: true, email: true },
  withdrawal: { inApp: true, push: true, email: true },
  referral: { inApp: true, push: true, email: true },
};

function normalizeChannelPrefs(raw: unknown): NotificationChannelPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.inApp !== "boolean" || typeof o.push !== "boolean" || typeof o.email !== "boolean") {
    return null;
  }
  return { inApp: o.inApp, push: o.push, email: o.email };
}

export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!raw || typeof raw !== "object") return merged;

  for (const category of NOTIFICATION_CATEGORIES) {
    const channel = normalizeChannelPrefs((raw as Record<string, unknown>)[category]);
    if (channel) merged[category] = channel;
  }
  return merged;
}

export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
  return parseNotificationPreferences(user?.notificationPreferences);
}

export function inferNotificationCategory(title: string): NotificationCategory {
  const t = title.toLowerCase();
  if (t.includes("chat") || t.includes("message") || t.includes("reply")) return "tradeChat";
  if (t.includes("withdrawal")) return "withdrawal";
  if (t.includes("referral")) return "referral";
  return "tradeStatus";
}

export const TRADE_CHAT_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;

/** Chat alerts only if the prior message on this trade was 15+ minutes ago (and trade not muted). */
export async function shouldSendTradeChatNotification(
  tradeId: string,
  excludeMessageId: string
): Promise<boolean> {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    select: { notificationsMuted: true },
  });
  if (trade?.notificationsMuted) return false;

  const previous = await prisma.tradeMessage.findFirst({
    where: { tradeId, id: { not: excludeMessageId } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!previous) return true;
  return Date.now() - previous.createdAt.getTime() >= TRADE_CHAT_NOTIFY_COOLDOWN_MS;
}
