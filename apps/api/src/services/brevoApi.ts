import { env } from "../env";

export function isBrevoApiConfigured(): boolean {
  return Boolean(env.brevo.apiKey);
}

function parseMailFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "GiftCard4Sale", email: from.trim() };
}

/** Verify the API key against Brevo (HTTPS — works when SMTP ports are blocked). */
export async function verifyBrevoApiConnection(): Promise<boolean> {
  if (!isBrevoApiConfigured()) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": env.brevo.apiKey, accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Brevo API verify failed:", res.status, body.slice(0, 200));
      return false;
    }
    console.log("[email] Brevo API ready (HTTPS — Render-compatible)");
    return true;
  } catch (err) {
    console.error("[email] Brevo API verify failed:", (err as Error).message);
    return false;
  }
}

export async function sendViaBrevoApi(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const sender = parseMailFrom(env.smtp.from);
  const fullSubject = subject.startsWith("[GiftCard4Sale]") ? subject : `[GiftCard4Sale] ${subject}`;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevo.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject: fullSubject,
        htmlContent: html,
        textContent: text,
        headers: {
          "X-Entity-Ref-ID": "giftcard4sale-transactional",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Brevo API failed → ${to}: HTTP ${res.status} — ${body.slice(0, 300)}`);
      return false;
    }

    const data = (await res.json()) as { messageId?: string };
    if (env.isProd) {
      console.log(`[email] sent (Brevo API) → ${to}: ${data.messageId || "ok"}`);
    }
    return true;
  } catch (err) {
    console.error(`[email] Brevo API failed → ${to}:`, (err as Error).message);
    return false;
  }
}
