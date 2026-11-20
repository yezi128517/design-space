import { assertProductionSecrets, config } from "@design-space/backend/config";
import { closeDb } from "@design-space/backend/db";
import { installModules } from "@design-space/backend/modules";
import { SERVER_MODULES } from "@design-space/site/modules/server";
import { ADMIN, DEPLOYMENT } from "@design-space/site";
import { startHeartbeat } from "@design-space/backend/operations/heartbeat";
import { startWorkerWatchdog } from "@design-space/backend/operations/watch";
import { buildApp } from "./app.ts";

installModules(SERVER_MODULES);
assertProductionSecrets([
  ["auth", "SESSION_SECRET"],
  ["auth", "IMG_PROXY_SIGN_SECRET"],
  ...DEPLOYMENT.requiredSecrets,
]);
// A site with admin pages needs a usable password.
if (config.environmentName === "production" && ADMIN && !(config.adminPassword && config.adminPassword.length >= 12)) {
  throw new Error("Refusing to start in production: set ADMIN_PASSWORD (at least 12 characters)");
}

const app = await buildApp();
await app.listen({ port: config.apiPort, host: process.env.API_HOST || "127.0.0.1" });
startHeartbeat(`api:${config.apiPort}`);
startWorkerWatchdog();

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  await app.close();
  await closeDb();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
