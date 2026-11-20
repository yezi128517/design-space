import { useState, type ReactNode } from "react";
import { useLoaderData } from "react-router";
import { SITE } from "@design-space/site";
import { beijingDate } from "@design-space/contracts/time";
import type { WorkResponse } from "../contracts.ts";
import { cachedPage, loadOr404 } from "@design-space/web/lib/api.server";
import { pageReuse } from "@design-space/web/lib/page-reuse";
import { breadcrumbLd, pageMeta, siteUrl } from "@design-space/web/lib/seo";
import { IconArrowLeft, IconExternal, IconImage } from "@design-space/web/components/icons";
import { IntentLink } from "@design-space/web/components/ui/IntentLink";
import { Picture } from "@design-space/web/components/ui/Picture";
import { Lightbox } from "@design-space/web/components/ui/Lightbox";
import { Badge } from "@design-space/web/components/ui/Badge";
import { buttonClass } from "@design-space/web/components/ui/Controls";
import { AsideCard } from "@design-space/web/components/ui/Page";
import { PhoneBar } from "@design-space/web/components/shell/PhoneBar";
import type { Screen } from "@design-space/web/components/shell/screens";
import { WorkTile } from "./WorkTile.tsx";

export const handle: Screen = { tab: "works" };
export { pageHeaders as headers } from "@design-space/web/lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request, params }: { request: Request; params: { id: string } }) {
  return cachedPage(300, await loadOr404<WorkResponse>(`/api/site/works/${encodeURIComponent(params.id)}`, { signal: request.signal }));
}

export function meta({ loaderData }: { loaderData?: WorkResponse }) {
  const work = loaderData?.work;
  if (!work) return pageMeta({ title: "作品", path: "/works" });
  const path = `/works/${work.id}`;
  const base = siteUrl();
  const description = work.summary?.slice(0, 150) ?? `${work.designer ?? work.sourceName} 的${work.category}设计作品${work.award ? `，${work.award}` : ""}。${SITE.name} 收录，附原文链接。`;
  return pageMeta({
    title: work.title,
    description,
    path,
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": `${base}${path}#work`,
        url: `${base}${path}`,
        name: work.title,
        inLanguage: SITE.locale,
        ...(work.designer ? { creator: { "@type": "Organization", name: work.designer } } : {}),
        ...(work.award ? { award: work.award } : {}),
        ...(work.summary ? { description: work.summary } : {}),
        ...(work.picture ? { image: `${base}${work.picture.url}` } : {}),
        ...(work.publishedAt ? { datePublished: work.publishedAt } : {}),
        isPartOf: { "@id": `${base}/#website` },
        ...(work.url ? { sameAs: work.url } : {}),
      },
      breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "设计作品", path: "/works" }, { name: work.title, path }]),
    ],
  });
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2 last:border-b-0">
      <dt className="shrink-0 text-[12px] text-ink-4">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] leading-[1.6] text-ink-2">{children}</dd>
    </div>
  );
}

export default function WorkPage() {
  const { work, related } = useLoaderData<typeof loader>();
  const [zoom, setZoom] = useState<number | null>(null);
  const host = new URL(work.url).hostname.replace(/^www\./, "");

  return (
    <div className="pb-10">
      <PhoneBar back={{ to: "/works", label: "作品" }} title={work.title} />
      <IntentLink to="/works" className="mt-1 hidden items-center gap-1 text-[13px] text-ink-3 transition-colors hover:text-ink lg:inline-flex">
        <IconArrowLeft size={15} /> 作品
      </IntentLink>

      <header className="mt-3 lg:mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{work.category}</Badge>
          {work.award && <Badge tone="amber">{work.award}</Badge>}
          {work.hasVideo && <Badge tone="hot">含视频</Badge>}
        </div>
        <h1 data-page-title="" className="mt-2.5 text-[23px] font-semibold leading-[1.3] text-ink lg:text-[30px]">{work.title}</h1>
        {work.designer && <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-2">{work.designer}</p>}
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div className="min-w-0">
          {work.picture ? (
            <button
              type="button"
              onClick={() => setZoom(0)}
              aria-label={`查看大图：${work.title}`}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-panel well"
            >
              <Picture
                src={work.picture.url}
                srcSet={work.picture.srcSet}
                sizes="(min-width: 1024px) 66vw, calc(100vw - 32px)"
                alt={work.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="aspect-[16/10] size-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </button>
          ) : (
            <div className="grid aspect-[16/10] place-items-center rounded-panel well">
              <IconImage size={30} className="text-ink-4" />
            </div>
          )}

          {work.summary && <p className="mt-5 text-[15px] leading-[1.85] text-ink-2">{work.summary}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <a href={work.url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              查看原文 <IconExternal size={14} />
            </a>
            {work.videoUrl && (
              <a href={work.videoUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
                观看视频 <IconExternal size={14} />
              </a>
            )}
            <span className="text-[12px] text-ink-4">原文在 {host}</span>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <AsideCard title="作品信息">
            <dl>
              <Fact label="分类">{work.category}</Fact>
              {work.award && <Fact label="奖项">{work.award}</Fact>}
              {work.year !== null && <Fact label="年份"><span className="num">{work.year}</span></Fact>}
              {work.designer && <Fact label="设计方">{work.designer}</Fact>}
              <Fact label="来源">{work.sourceName}</Fact>
              {work.publishedAt && <Fact label="发布"><time dateTime={work.publishedAt} suppressHydrationWarning>{beijingDate(work.publishedAt)}</time></Fact>}
            </dl>
          </AsideCard>
          <div className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">收录说明</h2>
            <p className="mt-2 text-[12px] leading-[1.8] text-ink-4">
              作品由编辑手工收录，标题、设计方、奖项与图片来自来源页面，版权归原作者与来源方所有。这里只作介绍与索引，完整内容请读原文。
            </p>
            <IntentLink to={`/works?source=${encodeURIComponent(work.sourceName)}`} className="mt-3 inline-flex text-[12.5px] font-medium text-accent hover:underline">
              看同一来源的作品
            </IntentLink>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="work-related" className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="work-related" className="text-[15px] font-bold text-ink">相关作品</h2>
            <IntentLink to={`/works?category=${encodeURIComponent(work.category)}`} className="text-[12px] font-medium text-accent hover:underline">
              更多{work.category}作品
            </IntentLink>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            {related.map((w) => (
              <li key={w.id}>
                <WorkTile w={w} sizes="(min-width: 1024px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Lightbox images={work.picture ? [{ src: work.picture.url, alt: work.title }] : []} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} />
    </div>
  );
}