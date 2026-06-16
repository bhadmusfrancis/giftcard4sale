import { prisma } from "../prisma";
import { env } from "../env";
import { sendEmail, layout, button } from "./email";
import { sendPushToUser } from "./push";

interface NotifyOptions {
  userId: string;
  title: string;
  body: string;
  link?: string; // relative path on web app, e.g. /dashboard/trades/123
  email?: boolean; // also send an email (default true)
  push?: boolean; // also send a web push (default true)
}

/**
 * Central place for "major activity" notifications. Always writes an in-app
 * notification, and optionally fires email + web push.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  const { userId, title, body, link, email = true, push = true } = opts;

  await prisma.notification.create({
    data: { userId, title, body, link: link ?? null },
  });

  if (push) {
    await sendPushToUser(userId, { title, body, link });
  }

  if (email) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      const fullLink = link ? `${env.webUrl}${link}` : env.webUrl;
      await sendEmail(
        user.email,
        title,
        layout(title, `<p>${body}</p><p>${button("Open GiftCard4Sale", fullLink)}</p>`)
      );
    }
  }
}
