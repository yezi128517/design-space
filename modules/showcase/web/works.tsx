import { Form, redirect, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { SITE } from "@design-space/site";
import { isWorkCategory, type WorksResponse } from "../contracts.ts";
import { cachedPage, loadOr404 } from "@design-space/web/lib/api.server";
import { pageReuse } from "@design-space/web/lib/page-reuse";
import { breadcrumbLd, itemListLd, listPath, pageMeta } from "@design-space/web/lib/seo";
import { IconClose, IconSearch } from "@design-space/web/components/icons";
import { IntentLink } from "@design-space/web/components/ui/IntentLink";
import { EmptyState } from "@design-space/web/components/ui/Page";
import { PillTabs } from "@design-space/web/components/ui/Tabs";
import { Pagination } from "@design-space/web/features/feed/DayList";
import { PhoneBar } from "@design-space/web/components/shell/PhoneBar";
import type { Screen } from "@design-space/web/components/shell/screens";
import { WorkTile } from "./WorkTile.tsx";

export const handle: Screen = { tab: "works", name: "作品" };
export { pageHeaders as headers } from "@design-space/web/lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

const TITLE = "设计作品";
const LEAD = "编辑收录的获奖作品与设计项目：iF、红点、A' Design Award 与数英。每一件都附上原文链接，影像类附视频。";

/** What each discipline covers, said once under the filters when it is the one being browsed. */
const NOTES: Record<string, string> = {
  产品: "工业产品、家具、设备与材料：从概念到量产的实物设计。",
  交互: "界面、体验与数字产品：软件、HMI、App 与游戏。",
  平面: "品牌、传达与包装：视觉识别、海报、字体与印刷。",
  空间: "建筑、室内与展陈：零售空间、展馆、装置与城市景观。",
  服务: "服务设计、社会创新与品牌体验活动。",
  影像: "影片、动画与影像叙事：广告片、短片与视觉实验。",
};

const filtersOf = (params: URLSearchParams) => ({
  category: isWorkCategory(params.get("category")) ? (params.get("category") as string) : null,
  source: params.get("source")?.trim().slice(0, 80) || null,
  q: params.get("q")?.trim().slice(0, 60) || null,
});

function worksHref(params: URLSearchParams, change: Record<string, string | null>, page = 1) {
  const sp = new URLSearchParams(params);
  for (const [key, value] of Object.entries(change)) {
    if (value === null || value === "") sp.delete(key);
    else sp.set(key, value);
  }
  sp.delete("page");
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/works?${qs}` : "/works";
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const f = filtersOf(url.searchParams);
  const page = Math.min(Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1), 50);
  const data = await loadOr404<WorksResponse>(listPath("/api/site/works", { ...f, page: page > 1 ? page : null }), { signal: request.signal });
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (data.total > 0 && page > pageCount) throw redirect(worksHref(url.searchParams, {}, pageCount));
  return cachedPage(120, { data, pageCount });
}

export function meta({ loaderData }: { loaderData?: { data: WorksResponse; pageCount: number } }) {
  const f = loaderData?.data;
  const page = f?.page ?? 1;
  const filtered = !!f && (!!f.category || !!f.source || !!f.q);
  const path = listPath("/works", { category: f?.category, source: f?.source, q: f?.q, page: page > 1 ? page : null });
  const title = f?.q ? `搜索作品：${f.q}` : f?.category ? `${f.category}设计作品` : TITLE;
  return pageMeta({
    title: `${title}${page > 1 ? ` · 第 ${page} 页` : ""}`,
    description: f?.category ? `${NOTES[f.category] ?? ""} ${SITE.name} 收录的${f.category}设计作品，附原文链接与视频。` : LEAD,
    path,
    image: "/og/pages/works.png",
    noindex: filtered || page > 1,
    jsonLd: filtered || page > 1 ? undefined : [
      itemListLd("/works", TITLE, f?.works.map((w) => w.title) ?? []),
      breadcrumbLd([{ name: SITE.name, path: "/" }, { name: TITLE, path: "/works" }]),
    ],
  });
}

export default function WorksPage() {
  const { data, pageCount } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const busy = navigation.state === "loading" && navigation.location?.pathname === "/works";
  const active = data.category ?? "all";
  const sourceActive = data.source ?? "all";
  const filtered = !!data.category || !!data.source || !!data.q;
  const total = data.categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="pb-8">
      <PhoneBar title="作品" />
      <header className="pb-1 pt-3 lg:pt-1">
        <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">{TITLE}</h1>
        <p className="mt-1.5 max-w-[62ch] text-[13px] leading-[1.75] text-ink-3">{LEAD}</p>
        <p className="mt-2 text-[12px] text-ink-4">
          收录 <span className="num font-semibold text-ink-3">{total}</span> 件 · 来自 <span className="num font-semibold text-ink-3">{data.sources.length}</span> 个来源
        </p>
      </header>

      <div className="mt-4 space-y-2.5">
        <PillTabs
          size="sm"
          layoutId="works-category"
          label="作品分类"
          active={active}
          items={[
            { key: "all", label: "全部", to: worksHref(params, { category: null }), count: total },
            ...data.categories.map((c) => ({ key: c.key, label: c.key, to: worksHref(params, { category: c.key }), count: c.count })),
          ]}
        />
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <PillTabs
            size="xs"
            layoutId="works-source"
            label="作品来源"
            active={sourceActive}
            className="min-w-0"
            items={[
              { key: "all", label: "全部来源", to: worksHref(params, { source: null }) },
              ...data.sources.map((s) => ({ key: s.name, label: s.name, to: worksHref(params, { source: s.name }), count: s.count })),
            ]}
          />
          <Form method="get" action="/works" role="search" className="group relative w-full shrink-0 lg:w-60">
            {data.category && <input type="hidden" name="category" value={data.category} />}
            {data.source && <input type="hidden" name="source" value={data.source} />}
            <label htmlFor="works-search" className="sr-only">搜索作品标题、设计方与奖项</label>
            <IconSearch size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4 transition-colors group-focus-within:text-ink-3" />
            <input
              id="works-search"
              name="q"
              defaultValue={data.q ?? ""}
              key={data.q ?? ""}
              placeholder="搜索作品、设计方、奖项…"
              maxLength={60}
              autoComplete="off"
              className="h-[42px] w-full rounded-full bg-well pl-10 pr-10 text-[16px] text-ink outline-none ring-1 ring-inset ring-line-soft transition-[background-color,box-shadow] placeholder:text-ink-4 hover:ring-line-strong focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:ring-accent sm:text-[14px]"
            />
            {data.q && (
              <IntentLink
                to={worksHref(params, { q: null })}
                aria-label="清空搜索"
                className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink"
              >
                <IconClose size={13} />
              </IntentLink>
            )}
          </Form>
        </div>
        {data.category && <p className="text-[12.5px] leading-[1.7] text-ink-3">{NOTES[data.category]}</p>}
      </div>

      <div className={`mt-5 transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
        {data.works.length === 0 ? (
          <div className="lg:card">
            <EmptyState
              title={filtered ? "没有找到符合条件的作品" : "作品架还是空的"}
              action={filtered ? <IntentLink to="/works" className="text-[13px] font-medium text-accent hover:underline">去掉筛选，看全部作品</IntentLink> : undefined}
            >
              {filtered ? "换个关键词，或者去掉分类与来源再试。" : "收录的作品会出现在这里，每件都带原文链接。"}
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-3 text-[12px] text-ink-4">
              <span>
                {data.q ? `搜索“${data.q}”` : data.category ? `${data.category}作品` : "全部作品"}
                {data.source ? ` · ${data.source}` : ""} · <span className="num">{data.total}</span> 件
              </span>
              {pageCount > 1 && <span className="num shrink-0">第 {data.page} / {pageCount} 页</span>}
            </div>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
              {data.works.map((w, i) => (
                <li key={w.id}>
                  <WorkTile w={w} eager={i < 4} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <Pagination page={data.page} pageCount={pageCount} href={(p) => worksHref(params, {}, p)} />
    </div>
  );
}