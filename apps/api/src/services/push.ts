import webpush from "web-push";
import { env } from "../env";
import { prisma } from "../prisma";

let pushEnabled = false;
if (env.vapid.publicKey && env.vapid.privateKey) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
  pushEnabled = true;
} else {
  console.warn("[push] VAPID keys not set - web push disabled.");
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; link?: string }
): Promise<void> {
  if (!pushEnabled) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // Subscription expired/invalid -> clean up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}
