// Topic pages: which articles a topic takes, and their counts.
// Written before the code, from the ways it can go wrong:
// - a company topic takes an article about another company that only mentions it (several subjects,
//   its name nowhere in the title), or drops one about it whose title names it in English, in another
//   case, next to Chinese text, or only by a product (it is the article's only subject);
// - a Latin name matches inside another word ("Video" is not IDEO); a headline naming a company
//   that is not a subject of the article gets in;
// - a technical-direction topic stops taking its tags;
// - withdrawn or not yet released articles appear in a list or a count;
// - an article or story page names a topic its reports do not belong to;
// - an article page cannot tell which of its tags are a topic's own, so they link to filtered lists;
// - a topic without content has no page, or an unknown slug or a page past the end has one.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@design-space/backend/db";
import { upsertMaterial } from "@design-space/backend/content/materials";
import { stopBoss } from "@design-space/backend/jobs/queue";
import { publishArticle } from "@design-space/backend/publication/publish";
import { TOPICS, loadTopicPage, listTopicSummaries, topicsOfStory } from "@design-space/backend/publication/topics";
import { buildApp } from "../apps/api/src/app.ts";

const T = tag();
const OFFICIAL = `test-topics-official-${T}`;
const MEDIA = `test-topics-media-${T}`;
const app = await buildApp();

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES
    (${OFFICIAL}, 'Official', 'rss', 'T1', 'editorial', '2100-01-01'),
    (${MEDIA}, 'Media', 'rss', 'T2', 'editorial', '2100-01-01')`;
});
after(async () => {
  await app.close();
  await stopBoss();
  await closeDb();
});

let n = 0;
interface Report {
  source?: string;
  at: Date;
  title: string;
  originalTitle?: string;
  subjects?: string[];
  tags?: string[];
  score?: number;
  selected?: boolean;
  fact?: number;
  category?: string;
}

/** A published report; `fact` links it to a fact before publishing, as grouping would. */
async function report(r: Report): Promise<string> {
  n += 1;
  const { articleId } = await upsertMaterial({
    sourceId: r.source ?? MEDIA, url: `https://example.com/topics-${T}-${n}`, title: r.originalTitle ?? r.title, bodyText: "body", bodyHtml: "<p>body</p>", bodyStatus: "ok", via: "fetch", publishedAt: r.at,
  });
  await sql`UPDATE articles SET discovered_at = ${r.at}, timeline_at = ${r.at}, grouped_at = now() WHERE id = ${articleId}`;
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected, subjects, tags)
            VALUES (${articleId}, 1, 'rule', 'pass', ${r.category ?? "design-tools"}, ${r.title}, ${`摘要 ${n}`}, ${r.score ?? 80}, ${r.selected ?? true}, ${r.subjects ?? []}, ${[r.category === "design-products" ? "产品发布" : r.category === "design-research" ? "论文/研究" : r.category === "design-practice" ? "教程/实践" : r.category === "industry" ? "行业动态" : r.category === "design-opinion" ? "观点/评论" : "工具更新", ...(r.tags ?? [])]})`;
  if (r.fact) await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${r.fact}, ${articleId}, 'report')`;
  await publishArticle(articleId, { releasedAt: new Date(r.at.getTime() + 60_000) });
  return articleId;
}

async function story(title: string): Promise<{ id: number; publicId: string }> {
  const publicId = randomUUID();
  const [s] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title, first_report_at, latest_at) VALUES (${publicId}, ${title}, now(), now()) RETURNING id`;
  return { id: s!.id, publicId };
}

async function fact(storyId: number | null, title: string): Promise<number> {
  const [f] = await sql<{ id: number }[]>`INSERT INTO facts (public_id, story_id, title) VALUES (${`f-${T}-${randomUUID()}`}, ${storyId}, ${title}) RETURNING id`;
  return f!.id;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const ids = (items: Array<{ id: string }>) => items.map((i) => i.id);
const page = async (slug: string, p = 1) => {
  const data = await loadTopicPage(slug, p, new Date());
  assert.ok(data, `${slug} page ${p}`);
  return data;
};
/** Every article of a topic, over all its pages. */
async function members(slug: string): Promise<string[]> {
  const first = await page(slug);
  const out = ids(first.items);
  for (let p = 2; p <= first.pageCount; p++) out.push(...ids((await page(slug, p)).items));
  return out;
}

test("a company topic takes the articles about it, not the ones that only mention it", async () => {
  const about = await report({ at: hoursAgo(30), title: `Claude Code 推出插件 ${T}`, subjects: ["anthropic"] });
  const product = await report({ at: hoursAgo(31), title: `Claude 新版上线 ${T}`, subjects: ["anthropic"] });
  const english = await report({ at: hoursAgo(32), title: `新工具发布 ${T}`, originalTitle: `Anthropic launches a design assistant ${T}`, subjects: ["anthropic", "openai"] });
  const subpoena = await report({ at: hoursAgo(33), title: `加州检察长向 OpenAI 发出传票 ${T}`, subjects: ["openai", "anthropic", "hugging-face"] });
  const lowerCase = await report({ at: hoursAgo(34), title: `openai 公布新的安全框架 ${T}`, subjects: ["openai", "anthropic"] });
  const pact = await report({ at: hoursAgo(35), title: `二十余家科技公司签署安全协议 ${T}`, subjects: ["openai", "anthropic", "google"] });
  const video = await report({ at: hoursAgo(36), title: `Video 格式的署名争议，OpenAI 参与 ${T}`, subjects: ["ideo", "openai"] });
  const adjacent = await report({ at: hoursAgo(37), title: `发布IDEO的新方法 ${T}`, subjects: ["ideo", "openai"] });
  const headline = await report({ at: hoursAgo(38), title: `Anthropic 被一篇盘点提到 ${T}`, subjects: ["google"] });
  const agent = await report({ at: hoursAgo(39), title: `智能体框架发布 ${T}`, tags: ["Agent 交互"] });

  const anthropic = await members("anthropic");
  for (const id of [about, product, english]) assert.ok(anthropic.includes(id), "about Anthropic");
  for (const id of [subpoena, lowerCase, pact, headline]) assert.ok(!anthropic.includes(id), "only mentions Anthropic");
  const openai = await members("openai");
  for (const id of [subpoena, lowerCase, video]) assert.ok(openai.includes(id), "about OpenAI");
  for (const id of [english, pact]) assert.ok(!openai.includes(id), "only mentions OpenAI");
  const ideo = await members("ideo");
  assert.ok(ideo.includes(adjacent), "IDEO next to Chinese text");
  assert.ok(!ideo.includes(video), "Video is not IDEO");
  assert.ok((await members("agent-ux")).includes(agent), "a direction topic takes its tag");

  // The article page names the topics it belongs to.
  const topicsOf = async (id: string) => {
    const res = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
    return (JSON.parse(res.body) as { topics: Array<{ slug: string }> }).topics.map((t) => t.slug);
  };
  assert.deepEqual(await topicsOf(about), ["anthropic", "tool-updates"]);
  assert.deepEqual(await topicsOf(subpoena), ["openai", "tool-updates"]);
  assert.deepEqual(await topicsOf(pact), ["tool-updates"]);
  assert.deepEqual(await topicsOf(agent), ["agent-ux", "tool-updates"]);
});

test("an article page says which of its tags are a topic's own", async () => {
  // A direction's or a form's tags, and the tag cards show for a company (its subject tag is never shown).
  const id = await report({ at: hoursAgo(3), title: `Anthropic 开源智能体框架 ${T}`, subjects: ["anthropic", "openai"], tags: ["Agent 交互", "开源/仓库", "Anthropic", "OpenAI", "框架"] });
  const res = await app.inject({ method: "GET", url: `/api/site/items/${id}` });
  const body = JSON.parse(res.body) as { tags: string[]; tagTopics: Record<string, string>; topics: Array<{ slug: string }> };
  assert.deepEqual(body.tags, ["工具更新", "Agent 交互", "开源/仓库", "Anthropic", "OpenAI", "框架"]);
  assert.deepEqual(body.tagTopics, { "工具更新": "tool-updates", "Agent 交互": "agent-ux", "开源/仓库": "open-source", Anthropic: "anthropic", "OpenAI": "openai" });
  // The company its title does not name is a topic of the tag, not of the article.
  assert.deepEqual(body.topics.map((t) => t.slug), ["anthropic", "agent-ux", "tool-updates", "open-source"]);
});

test("renaming a company topic keeps its old full name usable for search", async () => {
  const id = await report({at: hoursAgo(2), title: `Cursor 新编辑器上线 ${T}`, subjects: ['cursor'], selected: false});
  for (const query of ['Cursor / Anysphere', 'Anysphere / Cursor']) {
    const res = await app.inject({method: 'GET', url: `/api/site/pool?q=${encodeURIComponent(query)}`});
    assert.equal(res.statusCode, 200);
    assert.ok(ids(JSON.parse(res.body).items).includes(id), 'full company names must still find subject-tagged reports');
  }
});

test("a story page names the topics of its reports", async () => {
  const launch = await story(`智能体框架 V2 发布 ${T}`);
  await report({ source: OFFICIAL, at: hoursAgo(26), title: `智能体框架 V2 发布 ${T}`, tags: ["Agent 交互"], fact: await fact(launch.id, "发布 V2") });
  assert.deepEqual(await topicsOfStory(launch.id), [{ slug: "agent-ux", name: "智能体与对话式界面" }, { slug: "tool-updates", name: "工具更新" }]);
});

test("withdrawn articles stay out of lists and counts", async () => {
  const kept = await report({ at: hoursAgo(5), title: `Framer 发布新工具 ${T}`, subjects: ["framer"] });
  const withdrawn = await report({ at: hoursAgo(4), title: `Framer 撤回的消息 ${T}`, subjects: ["framer"] });
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${withdrawn}`;

  const data = await page("framer");
  assert.deepEqual(ids(data.items), [kept]);
  assert.equal(data.topic.total, 1);
  const summary = (await listTopicSummaries()).topics.find((t) => t.slug === "framer")!;
  assert.equal(summary.latest?.title, `Framer 发布新工具 ${T}`, "the index shows the newest public article");
});

test("every topic has a page; unknown topics and pages past the end have none", async () => {
  const empty = await page("vercel");
  assert.equal(empty.topic.indexable, false, "a topic without content is not indexed");
  assert.deepEqual(empty.items, []);
  assert.equal(await loadTopicPage("not-a-topic", 1, new Date()), null);
  assert.equal(await loadTopicPage("vercel", 2, new Date()), null);
  const index = await app.inject({ method: "GET", url: "/api/site/topics" });
  const body = JSON.parse(index.body) as { groups: Array<{ key: string }>; topics: Array<{ slug: string }> };
  assert.deepEqual(body.groups.map((g) => g.key), ["company", "field", "genre"]);
  assert.deepEqual(body.topics.map((t) => t.slug).sort(), TOPICS.map((t) => t.slug).sort(), "the index lists every topic");
});
