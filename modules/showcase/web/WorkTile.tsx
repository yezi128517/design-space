import type { WorkCard } from "../contracts.ts";
import { IconImage } from "@design-space/web/components/icons";
import { IntentLink } from "@design-space/web/components/ui/IntentLink";
import { Picture } from "@design-space/web/components/ui/Picture";

/** One work on the shelf: the picture leads, the words under it say who made it and what it won. */
export function WorkTile({ w, eager = false, sizes }: { w: WorkCard; eager?: boolean; sizes?: string }) {
  return (
    <IntentLink viewTransition to={`/works/${w.id}`} className="group card card-hover relative flex h-full flex-col overflow-hidden">
      <div className="relative overflow-hidden well">
        {w.picture ? (
          <Picture
            src={w.picture.url}
            srcSet={w.picture.srcSet}
            sizes={sizes ?? "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"}
            alt={w.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="aspect-[4/3] size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-bg-sunk">
            <IconImage size={26} className="text-ink-4" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex h-[22px] items-center rounded-full bg-bg/85 px-2.5 text-[11.5px] font-medium text-ink ring-1 ring-inset ring-line-soft backdrop-blur-md">
          {w.category}
        </span>
        {w.hasVideo && (
          <span className="absolute right-2.5 top-2.5 inline-flex h-[22px] items-center rounded-full bg-hot/90 px-2.5 text-[11.5px] font-medium text-white backdrop-blur-md">
            视频
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-[1.45] text-ink transition-colors group-hover:text-accent">{w.title}</h3>
        <p className="mt-1 line-clamp-1 text-[12px] leading-[1.6] text-ink-3">{w.designer ?? w.sourceName}</p>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2.5 text-[11.5px] text-ink-4">
          <span className="line-clamp-1">{w.award ?? w.sourceName}</span>
          {w.year !== null && <span className="num shrink-0 font-medium text-ink-3">{w.year}</span>}
        </div>
      </div>
    </IntentLink>
  );
}