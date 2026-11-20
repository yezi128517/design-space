// Fills the shelf with the works the editor checked by hand (seed.json): award pages and 数英 projects,
// each with its own link back to the source. Only the ones not there yet, so admin edits are never undone.
// Re-runnable:  node --env-file=.env modules/showcase/scripts/seed.ts
import { readFileSync } from "node:fs";
import { closeDb, sql } from "@design-space/backend/db";
import { isWorkCategory, type WorkInput } from "../contracts.ts";

interface SeedWork extends WorkInput {
  id: string;
}

const works = JSON.parse(readFileSync(new URL("../seed.json", import.meta.url), "utf8")) as SeedWork[];
let added = 0;
for (const w of works) {
  if (!isWorkCategory(w.category)) throw new Error(`${w.id}: 分类“${w.category}”不在作品分类里`);
  const inserted = await sql`
    INSERT INTO showcase_works (id, title, designer, category, award, year, source_name, url, video_url, image_url, summary, published_at, visible)
    VALUES (${w.id}, ${w.title}, ${w.designer ?? null}, ${w.category}, ${w.award ?? null}, ${w.year ?? null}, ${w.source_name},
      ${w.url}, ${w.video_url ?? null}, ${w.image_url ?? null}, ${w.summary ?? null}, ${w.published_at ?? null}, true)
    ON CONFLICT (id) DO NOTHING RETURNING id`;
  added += inserted.length;
}
console.log(`works: ${added} added, ${works.length - added} already there`);
await closeDb();