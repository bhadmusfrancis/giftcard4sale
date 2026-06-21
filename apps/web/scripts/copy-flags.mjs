import { cpSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "../../node_modules/flag-icons/flags");
const dest = join(root, "public/flags");

if (!existsSync(src)) {
  console.warn("[copy-flags] flag-icons not installed, skipping");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-flags] copied flag SVGs to public/flags");
