import { prisma } from "../prisma";
import { env } from "../env";
import { sendTransactionalEmail } from "./email";
import { sendPushToUser } from "./push";
import {
  inferNotificationCategory,
  getUserNotificationPreferences,
  shouldSendTradeChatNotification,
  type NotificationCategory,
} from "./notificationPreferences";

export interface NotifyOptions {
  userId: string;
  title: string;
  body: string;
  link?: string;
  email?: boolean;
  push?: boolean;
  emailSubject?: string;
  emailDetail?: string;
  securityNote?: string;
  category?: NotificationCategory;
  tradeId?: string;
}

const ADMIN_EMAIL_EVENTS = new Set([
  "New user registered",
  "New trade submitted",
  "Trade cancelled by user",
  "Duplicate card auto-rejected",
  "New withdrawal request",
  "Trade chat reply",
  "NoOnes resell needs attention",
  "Auto-credit failed after NoOnes release",
]);

export async function notify(opts: NotifyOptions): Promise<void> {
  const category = opts.category ?? inferNotificationCategory(opts.title);
  const wantsPush = opts.push ?? true;
  const wantsEmail = opts.email ?? true;

  if (category === "tradeChat" && opts.tradeId) {
    const trade = await prisma.trade.findUnique({
      where: { id: opts.tradeId },
      select: { notificationsMuted: true },
    });
    if (trade?.notificationsMuted) return;
  }

  const prefs = await getUserNotificationPreferences(opts.userId);
  const channels = prefs[category];

  if (channels.inApp) {
    await prisma.notification.create({
      data: { userId: opts.userId, title: opts.title, body: opts.body, link: opts.link ?? null },
    });
  }

  if (wantsPush && channels.push) {
    await sendPushToUser(opts.userId, { title: opts.title, body: opts.body, link: opts.link });
  }

  if (!wantsEmail || !channels.email) return;

  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  if (!user?.email) return;

  const fullLink = opts.link ? `${env.webUrl}${opts.link}` : env.webUrl;
  const paragraphs = [opts.body];
  if (opts.emailDetail) paragraphs.push(opts.emailDetail);

  await sendTransactionalEmail(user.email, opts.emailSubject ?? opts.title, {
    title: opts.title,
    paragraphs,
    ctaLabel: "View in GiftCard4Sale",
    ctaHref: fullLink,
    securityNote: opts.securityNote,
  }).then((ok) => {
    if (!ok) console.error(`[notify] email not sent for user ${opts.userId} (${opts.title})`);
  });
}

export async function notifyAdmins(opts: {
  title: string;
  body: string;
  link?: string;
  email?: boolean;
  emailDetail?: string;
  category?: NotificationCategory;
  tradeId?: string;
  messageId?: string;
}): Promise<void> {
  const category = opts.category ?? inferNotificationCategory(opts.title);

  if (category === "tradeChat" && opts.tradeId && opts.messageId) {
    if (!(await shouldSendTradeChatNotification(opts.tradeId, opts.messageId))) return;
  } else if (category === "tradeChat" && opts.tradeId) {
    const trade = await prisma.trade.findUnique({
      where: { id: opts.tradeId },
      select: { notificationsMuted: true },
    });
    if (trade?.notificationsMuted) return;
  }

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  const sendEmail = opts.email ?? ADMIN_EMAIL_EVENTS.has(opts.title);

  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        title: opts.title,
        body: opts.body,
        link: opts.link,
        email: sendEmail,
        emailDetail: opts.emailDetail,
        push: true,
        category,
        tradeId: opts.tradeId,
      })
    )
  );
}

export async function emailOperationsInbox(
  subject: string,
  paragraphs: string[],
  ctaHref?: string
): Promise<void> {
  if (!env.admin.email) return;
  await sendTransactionalEmail(env.admin.email, subject, {
    title: subject,
    paragraphs,
    ctaLabel: ctaHref ? "Open in admin" : undefined,
    ctaHref,
  });
}
