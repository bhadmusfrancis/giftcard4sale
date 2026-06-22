/**
 * npm workspaces often hoists @next/swc-win32-x64-msvc to the repo root.
 * Next.js looks next to apps/web/node_modules/next — copy the binary if missing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const targetDir = path.join(webRoot, "node_modules", "@next", "swc-win32-x64-msvc");
const targetBin = path.join(targetDir, "next-swc.win32-x64-msvc.node");

if (process.platform !== "win32") {
  process.exit(0);
}

if (fs.existsSync(targetBin)) {
  process.exit(0);
}

const candidates = [
  path.join(webRoot, "..", "..", "node_modules", "@next", "swc-win32-x64-msvc"),
  path.join(webRoot, "node_modules", "@next", ".swc-win32-x64-msvc-wIlg4jbm"),
];

for (const dir of candidates) {
  const bin = path.join(dir, "next-swc.win32-x64-msvc.node");
  if (!fs.existsSync(bin)) continue;
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(dir, targetDir, { recursive: true });
  console.log("[ensure-swc] Linked Next.js SWC binary for Windows");
  process.exit(0);
}
