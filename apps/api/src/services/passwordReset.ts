import { prisma } from "../prisma";
import { env } from "../env";
import { randomToken } from "../lib/auth";
import { sendTransactionalEmail } from "./email";

/** Issue a one-hour reset token and email the user a reset link. */
export async function sendPasswordResetEmail(
  user: { id: string; email: string },
  options: { adminRequested?: boolean } = {}
): Promise<void> {
  const resetToken = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const url = `${env.webUrl}/reset-password?token=${resetToken}`;
  const paragraphs = options.adminRequested
    ? [
        "An administrator requested a password reset for your GiftCard4Sale account.",
        "This link expires in 1 hour. If you did not expect this, contact support immediately.",
      ]
    : [
        "We received a request to reset your password.",
        "This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.",
      ];

  await sendTransactionalEmail(user.email, "Reset your password", {
    title: "Reset your password",
    preheader: "Use this link to choose a new GiftCard4Sale password.",
    paragraphs,
    ctaLabel: "Reset password",
    ctaHref: url,
    securityNote: "Never share this link with anyone.",
  });
}
