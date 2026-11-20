// What the showcase adds to the engine's pages: a 设计 section in the desktop sidebar, a 作品 tab on phones,
// and a row on 我的. Its own pages come from module.ts.
import { defineWebModule } from "@design-space/web/modules";
import { IconImage } from "@design-space/web/components/icons";

export const showcaseWeb = defineWebModule({
  name: "showcase",
  sidebar: { section: "设计", items: [{ to: "/works", label: "作品", icon: IconImage }] },
  tabs: [{ key: "works", to: "/works", label: "作品", icon: IconImage }],
  tools: [{ to: "/works", label: "设计作品", icon: <IconImage size={18} /> }],
});