import dotenv from "dotenv";
import path from "path";

const rootEnv = path.resolve(__dirname, "../../../.env");
const apiEnv = path.resolve(__dirname, "../.env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: apiEnv, override: true });

// Long-running CLI jobs use the direct Neon URL; the API server keeps DATABASE_URL (pooler).
const isApiServer = process.argv.some((arg) => /[/\\]index\.(ts|js)$/.test(arg));
if (!isApiServer && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
