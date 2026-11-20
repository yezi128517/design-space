// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@design-space/backend/modules";
import { showcaseServer } from "@design-space/showcase/server";

export const SERVER_MODULES: readonly ServerModule[] = [showcaseServer];
