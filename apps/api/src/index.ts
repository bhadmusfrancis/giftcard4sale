import express from "express";
import { env } from "./env";
import { healthHandler } from "./health";

const app = express();

if (env.isProd) app.set("trust proxy", 1);

app.get("/health", healthHandler);

app.listen(env.port, "0.0.0.0", () => {
  console.log(`GiftCard4Sale API listening on ${env.apiUrl} (port ${env.port})`);
  void import("./main.js").then(({ mountApi }) => mountApi(app));
});
