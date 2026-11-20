// The showcase's backend sockets: its own addresses, its pages in the sitemap, and its lines in /llms.txt.
import { defineServerModule } from "@design-space/backend/modules";
import { siteUrl } from "@design-space/backend/publication/links";
import { registerShowcase } from "./backend/routes.ts";
import { workSitemapEntries } from "./backend/works.ts";

export const showcaseServer = defineServerModule({
  name: "showcase",
  http: registerShowcase,
  sitemap: { entries: workSitemapEntries },
  llms: () => ({
    api: [
      `- [公开 API · 设计作品](${siteUrl("/api/site/works")}): JSON，编辑收录的获奖与优秀作品；支持 category（产品/交互/平面/空间/服务/影像）、source、q、page，每条含设计方、奖项、封面与原文链接`,
      `- [公开 API · 作品详情](${siteUrl("/api/site/works/{id}")}): 单件作品的简介、原文与视频链接，以及同类作品；id 只来自作品列表，不要猜测`,
    ],
    pages: [`- [设计作品](${siteUrl("/works")}): 编辑收录的 iF、红点、A' Design Award 获奖作品与数英项目，按分类和来源筛选，每件都附原文链接`],
  }),
});