// Runs collection for given sources now (development / operations helper).
// node --env-file=.env scripts/collect.ts rss-openai-news rss-hugging-face ...
import { closeDb } from "@design-space/backend/db";
import { stopBoss } from "@design-space/backend/jobs/queue";
import { installModules } from "@design-space/backend/modules";
import { collectSource } from "@design-space/backend/sources/collect";
import { SERVER_MODULES } from "@design-space/site/modules/server";

installModules(SERVER_MODULES);
try {
  for (const id of process.argv.slice(2)) {
    const started = performance.now();
    const r = await collectSource(id, { force: true });
    console.log(JSON.stringify({ ...r, ms: Math.round(performance.now() - started) }));
  }
} finally {
  await stopBoss();
  await closeDb();
}
