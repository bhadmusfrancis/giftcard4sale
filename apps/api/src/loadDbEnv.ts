import dotenv from "dotenv";
import path from "path";

const rootEnv = path.resolve(__dirname, "../../../.env");
const apiEnv = path.resolve(__dirname, "../.env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: apiEnv, override: true });

// Neon pooler can drop long-running connections (e.g. rate sync); prefer direct when configured.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
