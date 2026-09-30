// IndexNow verification key. Served at /api/indexnow-key and referenced as
// `keyLocation` in ping payloads so Bing/Yandex can confirm we own the URLs we
// submit. The key is not a secret — it is public by design; override with
// INDEXNOW_KEY env if it ever needs rotating.
const DEFAULT_KEY = "4f2c9d7e1b6a4380a5e7c2d9f1b4e6a8";

export function indexNowKey(): string {
  return (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim();
}
