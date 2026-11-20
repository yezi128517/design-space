// The showcase's addresses: a public gallery of design works, one page per work, and the back office page
// that curates them (modules/showcase/web/admin.tsx).
import { defineModule } from "@design-space/contracts/modules";

export const showcaseModule = defineModule({
  name: "showcase",
  pages: [
    { path: "works", file: "web/works.tsx" },
    { path: "works/:id", file: "web/work.tsx" },
    { path: "showcase", file: "web/admin.tsx", admin: true, nav: "作品" },
  ],
  apiPaths: [/^\/api\/site\/works/, /^\/api\/admin\/showcase/],
});