// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@design-space/web/modules";
import { showcaseWeb } from "@design-space/showcase/web";

export const WEB_MODULES: readonly WebModule[] = [showcaseWeb];
