import { prisma } from "../prisma";
import { env } from "../env";
import { sendTransactionalEmail } from "./email";
import { sendPushToUser } from "./push";

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
}

const ADMIN_EMAIL_EVENTS = new Set([
  "New trade submitted",
  "Trade cancelled by user",
  "New withdrawal request",
  "Trade chat reply",
  "NoOnes resell needs attention",
]);

export async function notify(opts: NotifyOptions): Promise<void> {
  const { userId, title, body, link, push = true, securityNote } = opts;
  const email = opts.email ?? true;

  await prisma.notification.create({
    data: { userId, title, body, link: link ?? null },
  });

  if (push) {
    await sendPushToUser(userId, { title, body, link });
  }

  if (!email) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const fullLink = link ? `${env.webUrl}${link}` : env.webUrl;
  const paragraphs = [body];
  if (opts.emailDetail) paragraphs.push(opts.emailDetail);

  await sendTransactionalEmail(user.email, opts.emailSubject ?? title, {
    title,
    paragraphs,
    ctaLabel: "View in GiftCard4Sale",
    ctaHref: fullLink,
    securityNote,
  }).then((ok) => {
    if (!ok) console.error(`[notify] email not sent for user ${userId} (${title})`);
  });
}

export async function notifyAdmins(opts: {
  title: string;
  body: string;
  link?: string;
  email?: boolean;
  emailDetail?: string;
}): Promise<void> {
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
