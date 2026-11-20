// The showcase's own faces: the gallery reads a stored work as a card or a detail, the back office edits
// the same rows. A work is entered by hand (an award's page, a competition, a blogger's post), so every
// change is audited and the link back to where it was seen is kept.
import { createHash } from "node:crypto";
import { audit, Conflict } from "@design-space/backend/audit";
import { one, sql } from "@design-space/backend/db";
import { proxiedImage, proxiedImageSet } from "@design-space/backend/media/imgproxy";
import {
  WORK_CATEGORIES,
  type AdminWork,
  type AdminWorksResponse,
  type WorkCard,
  type WorkCategory,
  type WorkDetail,
  type WorkInput,
  type WorkResponse,
  type WorksResponse,
} from "../contracts.ts";

const PAGE_SIZE = 24;
const ADMIN_PAGE_SIZE = 50;

interface WorkRow {
  id: string;
  title: string;
  designer: string | null;
  category: string;
  award: string | null;
  year: number | null;
  source_name: string;
  url: string;
  video_url: string | null;
  image_url: string | null;
  summary: string | null;
  published_at: Date | null;
  visible: boolean;
  updated_at: Date;
}

const COLUMNS = sql`id, title, designer, category, award, year, source_name, url, video_url, image_url, summary, published_at, visible, updated_at`;

const card = (r: WorkRow): WorkCard => ({
  id: r.id,
  title: r.title,
  designer: r.designer,
  category: r.category as WorkCategory,
  award: r.award,
  year: r.year,
  sourceName: r.source_name,
  picture: r.image_url ? { url: proxiedImage(r.image_url, "card")!, srcSet: proxiedImageSet(r.image_url, "card") ?? undefined } : null,
  hasVideo: r.video_url !== null,
});

const detail = (r: WorkRow): WorkDetail => ({
  ...card(r),
  picture: r.image_url ? { url: proxiedImage(r.image_url, "full")!, srcSet: proxiedImageSet(r.image_url, "hero") ?? undefined } : null,
  url: r.url,
  videoUrl: r.video_url,
  summary: r.summary,
  publishedAt: r.published_at?.toISOString() ?? null,
});

export interface WorkFilter {
  category: WorkCategory | null;
  source: string | null;
  q: string | null;
}

/** The gallery's filter, spelled once for the page and its count. */
const matching = (f: WorkFilter) => {
  const like = f.q ? `%${f.q}%` : null;
  return sql`visible
    AND (${f.category}::text IS NULL OR category = ${f.category})
    AND (${f.source}::text IS NULL OR source_name = ${f.source})
    AND (${like}::text IS NULL OR title ILIKE ${like} OR designer ILIKE ${like} OR award ILIKE ${like})`;
};

const newestFirst = sql`coalesce(published_at, make_date(year, 1, 1)) DESC NULLS LAST, id DESC`;

export async function listWorks(f: WorkFilter & { page: number }): Promise<WorksResponse> {
  const page = Math.max(1, Math.floor(f.page) || 1);
  const [rows, counts, categories, sources] = await Promise.all([
    sql<WorkRow[]>`SELECT ${COLUMNS} FROM showcase_works WHERE ${matching(f)} ORDER BY ${newestFirst} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    sql<{ total: number }[]>`SELECT count(*)::int AS total FROM showcase_works WHERE ${matching(f)}`,
    sql<{ category: string; count: number }[]>`SELECT category, count(*)::int AS count FROM showcase_works WHERE visible GROUP BY category`,
    sql<{ source_name: string; count: number }[]>`SELECT source_name, count(*)::int AS count FROM showcase_works WHERE visible GROUP BY source_name ORDER BY count DESC, source_name`,
  ]);
  const byCategory = new Map(categories.map((c) => [c.category, c.count]));
  return {
    works: rows.map(card),
    total: one(counts).total,
    page,
    pageSize: PAGE_SIZE,
    category: f.category,
    source: f.source,
    q: f.q,
    categories: WORK_CATEGORIES.map((key) => ({ key, count: byCategory.get(key) ?? 0 })),
    sources: sources.map((s) => ({ name: s.source_name, count: s.count })),
  };
}

export async function loadWork(id: string): Promise<WorkResponse | null> {
  const rows = await sql<WorkRow[]>`SELECT ${COLUMNS} FROM showcase_works WHERE id = ${id} AND visible`;
  const row = rows[0];
  if (!row) return null;
  const related = await sql<WorkRow[]>`
    SELECT ${COLUMNS} FROM showcase_works
    WHERE visible AND id <> ${id} AND (category = ${row.category} OR source_name = ${row.source_name})
    ORDER BY (category = ${row.category}) DESC, ${newestFirst} LIMIT 6`;
  return { work: detail(row), related: related.map(card) };
}

/** The gallery and every work in it, for the sitemap. */
export async function workSitemapEntries() {
  const rows = await sql<{ id: string; updated_at: Date }[]>`SELECT id, updated_at FROM showcase_works WHERE visible ORDER BY id`;
  return [
    { loc: "/works", changefreq: "daily", priority: 0.8 },
    ...rows.map((r) => ({ loc: `/works/${r.id}`, lastmod: r.updated_at, changefreq: "monthly", priority: 0.6 })),
  ];
}

const adminRow = (r: WorkRow): AdminWork => ({
  id: r.id,
  title: r.title,
  designer: r.designer,
  category: r.category as WorkCategory,
  award: r.award,
  year: r.year,
  source_name: r.source_name,
  url: r.url,
  video_url: r.video_url,
  image_url: r.image_url,
  summary: r.summary,
  published_at: r.published_at?.toISOString() ?? null,
  visible: r.visible,
  updated_at: r.updated_at.toISOString(),
});

export async function adminWorks(f: { page: number; visible: "all" | "visible" | "hidden"; category: WorkCategory | null; q: string | null }): Promise<AdminWorksResponse> {
  const page = Math.max(1, Math.floor(f.page) || 1);
  const like = f.q ? `%${f.q}%` : null;
  const state = f.visible === "all" ? null : f.visible === "visible";
  const where = sql`(${state}::boolean IS NULL OR visible = ${state})
    AND (${f.category}::text IS NULL OR category = ${f.category})
    AND (${like}::text IS NULL OR title ILIKE ${like} OR designer ILIKE ${like} OR source_name ILIKE ${like} OR url ILIKE ${like})`;
  const [rows, counts, categories] = await Promise.all([
    sql<WorkRow[]>`SELECT ${COLUMNS} FROM showcase_works WHERE ${where} ORDER BY updated_at DESC, id LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(page - 1) * ADMIN_PAGE_SIZE}`,
    sql<{ total: number; visible: number; hidden: number; with_video: number }[]>`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE visible)::int AS visible,
        count(*) FILTER (WHERE NOT visible)::int AS hidden, count(video_url)::int AS with_video
      FROM showcase_works WHERE ${where}`,
    sql<{ category: string; count: number }[]>`SELECT category, count(*)::int AS count FROM showcase_works GROUP BY category`,
  ]);
  const tally = one(counts);
  const byCategory = new Map(categories.map((c) => [c.category, c.count]));
  return {
    rows: rows.map(adminRow),
    total: tally.total,
    page,
    visible: tally.visible,
    hidden: tally.hidden,
    withVideo: tally.with_video,
    categories: WORK_CATEGORIES.map((key) => ({ key, count: byCategory.get(key) ?? 0 })),
  };
}

export async function adminWork(id: string): Promise<AdminWork | null> {
  const rows = await sql<WorkRow[]>`SELECT ${COLUMNS} FROM showcase_works WHERE id = ${id}`;
  return rows[0] ? adminRow(rows[0]) : null;
}

/** A work's id names where it was seen and what it is there, so the same link always lands on one row. */
const workId = (url: string) => {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "").split(".")[0] ?? "work";
  const tail = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
  const slug = `${host}-${tail}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${slug || "work"}-${createHash("sha1").update(url).digest("hex").slice(0, 8)}`;
};

const stored = (input: WorkInput) => ({
  title: input.title,
  designer: input.designer ?? null,
  category: input.category,
  award: input.award ?? null,
  year: input.year ?? null,
  source_name: input.source_name,
  url: input.url,
  video_url: input.video_url ?? null,
  image_url: input.image_url ?? null,
  summary: input.summary ?? null,
  published_at: input.published_at ?? null,
  visible: input.visible ?? true,
});

export async function createWork(input: WorkInput, actor: string, reason: string | null, requestId?: string): Promise<AdminWork> {
  const id = workId(input.url);
  const clash = await sql<{ id: string }[]>`SELECT id FROM showcase_works WHERE url = ${input.url} OR id = ${id}`;
  if (clash.length) throw new Conflict(`已经收录过这条链接（${clash[0]!.id}）`);
  const values = stored(input);
  const rows = await sql<WorkRow[]>`
    INSERT INTO showcase_works (id, title, designer, category, award, year, source_name, url, video_url, image_url, summary, published_at, visible)
    VALUES (${id}, ${values.title}, ${values.designer}, ${values.category}, ${values.award}, ${values.year}, ${values.source_name},
      ${values.url}, ${values.video_url}, ${values.image_url}, ${values.summary}, ${values.published_at}, ${values.visible})
    RETURNING ${COLUMNS}`;
  const row = adminRow(one(rows));
  await audit(actor, "showcase.create", `work:${id}`, reason, null, row, { requestId });
  return row;
}

export async function updateWork(id: string, input: WorkInput, actor: string, reason: string | null, requestId?: string): Promise<AdminWork | null> {
  const before = await adminWork(id);
  if (!before) return null;
  const values = stored(input);
  const clash = await sql<{ id: string }[]>`SELECT id FROM showcase_works WHERE url = ${values.url} AND id <> ${id}`;
  if (clash.length) throw new Conflict(`另一条作品已经用了这条链接（${clash[0]!.id}）`);
  const rows = await sql<WorkRow[]>`
    UPDATE showcase_works SET title = ${values.title}, designer = ${values.designer}, category = ${values.category}, award = ${values.award},
      year = ${values.year}, source_name = ${values.source_name}, url = ${values.url}, video_url = ${values.video_url},
      image_url = ${values.image_url}, summary = ${values.summary}, published_at = ${values.published_at}, visible = ${values.visible}, updated_at = now()
    WHERE id = ${id} RETURNING ${COLUMNS}`;
  const row = adminRow(one(rows));
  await audit(actor, "showcase.update", `work:${id}`, reason, before, row, { requestId });
  return row;
}

export async function setWorkVisible(id: string, visible: boolean, actor: string, reason: string | null, requestId?: string): Promise<AdminWork | null> {
  const before = await adminWork(id);
  if (!before) return null;
  const rows = await sql<WorkRow[]>`UPDATE showcase_works SET visible = ${visible}, updated_at = now() WHERE id = ${id} RETURNING ${COLUMNS}`;
  const row = adminRow(one(rows));
  await audit(actor, visible ? "showcase.show" : "showcase.hide", `work:${id}`, reason, before, row, { requestId });
  return row;
}

export async function deleteWork(id: string, actor: string, reason: string | null, requestId?: string): Promise<boolean> {
  const before = await adminWork(id);
  if (!before) return false;
  await sql`DELETE FROM showcase_works WHERE id = ${id}`;
  await audit(actor, "showcase.delete", `work:${id}`, reason, before, null, { requestId });
  return true;
}