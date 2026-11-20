// The showcase's addresses: the gallery reads /api/site/works, the back office edits /api/admin/showcase.
// Writes go through adminHandler (session + CSRF) and are audited in backend/works.ts.
import type { FastifyInstance, FastifyRequest } from "fastify";
import { actorOf } from "@design-space/backend/admin/auth";
import { adminHandler } from "../../../apps/api/src/routes/admin-auth.ts";
import { body, orNotFound, page, param, q } from "../../../apps/api/src/routes/admin.ts";
import { siteHandler } from "../../../apps/api/src/routes/site.ts";
import { looseQuery, sendJsonWithEtag, sendProblem } from "../../../apps/api/src/http/respond.ts";
import { isWorkCategory, type WorkInput } from "../contracts.ts";
import { adminWork, adminWorks, createWork, deleteWork, listWorks, loadWork, setWorkVisible, updateWork } from "./works.ts";

const bad = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

const str = (value: unknown, field: string, max: number): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw bad(`${field}格式不正确`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw bad(`${field}最长 ${max} 个字符`);
  return trimmed;
};

const need = (value: unknown, field: string, max: number): string => {
  const written = str(value, field, max);
  if (written === null) throw bad(`${field}不能为空`);
  return written;
};

const url = (value: unknown, field: string): string | null => {
  const raw = str(value, field, 2000);
  if (raw === null) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw bad(`${field}要是完整的链接（https://…）`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw bad(`${field}只支持 http 或 https 链接`);
  return parsed.toString();
};

const needUrl = (value: unknown, field: string): string => {
  const written = url(value, field);
  if (written === null) throw bad(`${field}不能为空`);
  return written;
};

/** The form as the back office posts it. */
function readWork(raw: Record<string, unknown>): WorkInput {
  const category = raw.category;
  if (!isWorkCategory(category)) throw bad("请选择作品分类");
  const year = raw.year === null || raw.year === undefined || raw.year === "" ? null : Number(raw.year);
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) throw bad("年份要是 1900 到 2100 之间的整数");
  const publishedAt = str(raw.published_at, "发布日期", 40);
  if (publishedAt !== null && Number.isNaN(Date.parse(publishedAt))) throw bad("发布日期格式不正确");
  return {
    title: need(raw.title, "标题", 200),
    designer: str(raw.designer, "设计方", 160),
    category,
    award: str(raw.award, "奖项", 160),
    year,
    source_name: need(raw.source_name, "来源", 80),
    url: needUrl(raw.url, "原文链接"),
    video_url: url(raw.video_url, "视频链接"),
    image_url: url(raw.image_url, "封面图链接"),
    summary: str(raw.summary, "简介", 2000),
    published_at: publishedAt === null ? null : new Date(publishedAt).toISOString(),
    visible: raw.visible === undefined ? true : raw.visible === true || raw.visible === "true",
  };
}

const reason = (req: FastifyRequest) => str(body(req).reason, "备注", 500);
const requestId = (req: FastifyRequest) => String(req.headers["idempotency-key"] ?? "") || undefined;

export function registerShowcase(app: FastifyInstance) {
  app.get("/api/site/works", siteHandler(async (req, reply) => {
    const query = looseQuery(req);
    const category = query.category ?? null;
    if (category !== null && !isWorkCategory(category)) return sendProblem(req, reply, { status: 400, code: "invalid_request", detail: "invalid category" });
    const data = await listWorks({
      page: Math.max(1, Number(query.page) || 1),
      category,
      source: query.source?.trim() || null,
      q: query.q?.trim().slice(0, 60) || null,
    });
    return sendJsonWithEtag(req, reply, data, { etagPrefix: "works", cacheControl: "public, max-age=60, s-maxage=60" });
  }));

  app.get("/api/site/works/:id", siteHandler(async (req, reply) => {
    const data = await loadWork(param(req, "id"));
    if (!data) return sendProblem(req, reply, { status: 404, code: "not_found", detail: "Not found." });
    return sendJsonWithEtag(req, reply, data, { etagPrefix: "work", cacheControl: "public, max-age=120, s-maxage=120" });
  }));

  app.get("/api/admin/showcase/works", adminHandler(async (req) => {
    const f = q(req);
    const visible = f.visible === "visible" || f.visible === "hidden" ? f.visible : "all";
    const category = isWorkCategory(f.category) ? f.category : null;
    return adminWorks({ page: page(req), visible, category, q: f.q?.trim().slice(0, 60) || null });
  }));
  app.get("/api/admin/showcase/works/:id", adminHandler(async (req, reply) => orNotFound(req, reply, await adminWork(param(req, "id")))));
  app.post("/api/admin/showcase/works", adminHandler(async (req, _reply, admin) => createWork(readWork(body(req)), actorOf(admin), reason(req), requestId(req))));
  app.patch("/api/admin/showcase/works/:id", adminHandler(async (req, reply, admin) =>
    orNotFound(req, reply, await updateWork(param(req, "id"), readWork(body(req)), actorOf(admin), reason(req), requestId(req)))));
  app.post("/api/admin/showcase/works/:id/visibility", adminHandler(async (req, reply, admin) =>
    orNotFound(req, reply, await setWorkVisible(param(req, "id"), body(req).visible === true || body(req).visible === "true", actorOf(admin), reason(req)))));
  app.delete("/api/admin/showcase/works/:id", adminHandler(async (req, reply, admin) =>
    (await deleteWork(param(req, "id"), actorOf(admin), reason(req))) ? { deleted: true } : orNotFound(req, reply, null)));
}