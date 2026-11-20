// The shelf: only public works reach the gallery, its filters and search narrow the same rows, a work
// keeps the link back to where it was seen, and the back office cannot write without a session and a
// CSRF token — every change it does make is in the audit log.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { ADMIN } from "@design-space/site";
import { SERVER_MODULES } from "@design-space/site/modules/server";
import { passwordLogin, SESSION_COOKIE } from "@design-space/backend/admin/auth";
import { config } from "@design-space/backend/config";
import { closeDb, sql } from "@design-space/backend/db";
import { stopBoss } from "@design-space/backend/jobs/queue";
import { installModules } from "@design-space/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { registerAdmin } from "../../../apps/api/src/routes/admin.ts";
import { createWork, listWorks, loadWork, workSitemapEntries } from "../backend/works.ts";
import type { WorkInput } from "../contracts.ts";

const T = tag();
installModules(SERVER_MODULES);
const app = await buildApp();
// The engine's admin API, which a site without admin pages does not mount.
if (!ADMIN) registerAdmin(app);
after(async () => { await app.close(); await stopBoss(); await closeDb(); });

const SOURCE = `测试设计奖 ${T}`;
const input = (n: number, over: Partial<WorkInput> = {}): WorkInput => ({
  title: `作品 ${T}-${n}`,
  designer: `工作室 ${T}`,
  category: "产品",
  award: `金奖 ${T}`,
  year: 2026,
  source_name: SOURCE,
  url: `https://showcase-${T}.example.com/work/${n}`,
  image_url: `https://showcase-${T}.example.com/cover/${n}.jpg`,
  summary: `第 ${n} 件作品，简介照来源页面写。`,
  published_at: "2026-11-01T00:00:00+08:00",
  ...over,
});

const [one, two, hidden] = await Promise.all([
  createWork(input(1), "test", "收录"),
  createWork(input(2, { category: "交互" }), "test", "收录"),
  createWork(input(3, { visible: false }), "test", "先不公开"),
]);

test("the gallery lists only public works, with a picture and no link to the source yet", async () => {
  const all = await listWorks({ category: null, source: null, q: null, page: 1 });
  assert.deepEqual(all.works.map((w) => w.id).sort(), [one.id, two.id].sort());
  assert.equal(all.total, 2);
  assert.equal(all.works[0]!.hasVideo, false);
  assert.match(all.works[0]!.picture!.url, /^\/api\/img-proxy\?u=/);
  assert.deepEqual(all.categories.find((c) => c.key === "产品"), { key: "产品", count: 1 });
  assert.deepEqual(all.sources, [{ name: SOURCE, count: 2 }]);
});

test("category, source and search narrow the same rows", async () => {
  assert.deepEqual((await listWorks({ category: "交互", source: null, q: null, page: 1 })).works.map((w) => w.id), [two.id]);
  assert.equal((await listWorks({ category: null, source: SOURCE, q: null, page: 1 })).total, 2);
  assert.equal((await listWorks({ category: null, source: null, q: `工作室 ${T}`, page: 1 })).total, 2);
  assert.equal((await listWorks({ category: null, source: null, q: `金奖 ${T}`, page: 1 })).total, 2);
  assert.equal((await listWorks({ category: null, source: null, q: "没有这个词", page: 1 })).total, 0);
  assert.equal((await listWorks({ category: "产品", source: null, q: null, page: 1 })).works[0]!.id, one.id);
});

test("a work keeps its own link, its video and the works beside it", async () => {
  const film = await createWork(input(4, { category: "交互", video_url: "https://www.bilibili.com/video/BV1test/" }), "test", "收录");
  const detail = await loadWork(two.id);
  assert.equal(detail!.work.url, input(2).url);
  assert.equal(detail!.work.videoUrl, null);
  assert.equal(detail!.work.summary, input(2).summary);
  assert.ok(detail!.related.some((w) => w.id === film.id));
  assert.ok(!detail!.related.some((w) => w.id === hidden.id));
  assert.equal((await loadWork(film.id))!.work.hasVideo, true);
  assert.equal(await loadWork(hidden.id), null);
  assert.equal(await loadWork("no-such-work"), null);
});

test("the public api answers the gallery and refuses a hidden work or a bad category", async () => {
  const list = await app.inject({ method: "GET", url: `/api/site/works?category=${encodeURIComponent("产品")}` });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(list.json().works.map((w: { id: string }) => w.id), [one.id]);
  assert.equal((await app.inject({ method: "GET", url: `/api/site/works/${one.id}` })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/api/site/works/${hidden.id}` })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: "/api/site/works?category=not-a-category" })).statusCode, 400);
});

test("the sitemap carries the gallery and every public work", async () => {
  const entries = await workSitemapEntries();
  assert.ok(entries.some((e) => e.loc === "/works"));
  assert.ok(entries.some((e) => e.loc === `/works/${one.id}`));
  assert.ok(!entries.some((e) => e.loc === `/works/${hidden.id}`));
});

test("the back office writes only with a session and a CSRF token, and records why", async () => {
  const password = config.adminPassword;
  config.adminPassword = "showcase-test-password";
  try {
    const body = input(9);
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/showcase/works", payload: body })).statusCode, 401);
    const { token } = await passwordLogin(config.adminPassword, "/admin", "test");
    const cookie = `${SESSION_COOKIE}=${token}`;
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/showcase/works", headers: { cookie }, payload: body })).statusCode, 403);
    const me = await app.inject({ method: "GET", url: "/api/admin/me", headers: { cookie } });
    const headers = { cookie, "x-csrf-token": me.json().csrf };

    const created = await app.inject({ method: "POST", url: "/api/admin/showcase/works", headers, payload: { ...body, reason: "手工收录" } });
    assert.equal(created.statusCode, 200);
    const id = created.json().id as string;
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/showcase/works", headers, payload: body })).statusCode, 409);
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/showcase/works", headers, payload: { ...body, url: "not-a-link" } })).statusCode, 400);
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/showcase/works", headers, payload: { ...body, url: "https://elsewhere.example.com/x", category: "没有这类" } })).statusCode, 400);

    const edited = await app.inject({ method: "PATCH", url: `/api/admin/showcase/works/${id}`, headers, payload: { ...body, category: "平面", reason: "改分类" } });
    assert.equal(edited.statusCode, 200);
    assert.equal(edited.json().category, "平面");
    assert.deepEqual((await listWorks({ category: "平面", source: null, q: null, page: 1 })).works.map((w) => w.id), [id]);

    const listed = await app.inject({ method: "GET", url: "/api/admin/showcase/works?visible=hidden", headers: { cookie } });
    assert.equal(listed.statusCode, 200);
    assert.ok(listed.json().rows.some((r: { id: string }) => r.id === hidden.id));
    assert.equal(listed.json().hidden, 1);

    const hid = await app.inject({ method: "POST", url: `/api/admin/showcase/works/${id}/visibility`, headers, payload: { visible: false, reason: "来源要求撤下" } });
    assert.equal(hid.statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: `/api/site/works/${id}` })).statusCode, 404);
    assert.equal((await app.inject({ method: "DELETE", url: `/api/admin/showcase/works/${id}`, headers, payload: { reason: "重复收录" } })).statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: `/api/admin/showcase/works/${id}`, headers: { cookie } })).statusCode, 404);
    assert.equal((await app.inject({ method: "DELETE", url: `/api/admin/showcase/works/${id}`, headers, payload: { reason: "再删一次" } })).statusCode, 404);

    const log = await sql<{ action: string; reason: string | null }[]>`SELECT action, reason FROM audit_log WHERE subject = ${`work:${id}`} ORDER BY id`;
    assert.deepEqual(log.map((r) => r.action), ["showcase.create", "showcase.update", "showcase.hide", "showcase.delete"]);
    assert.deepEqual(log.map((r) => r.reason), ["手工收录", "改分类", "来源要求撤下", "重复收录"]);
  } finally {
    config.adminPassword = password;
  }
});