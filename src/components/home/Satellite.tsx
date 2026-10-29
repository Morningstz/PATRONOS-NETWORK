import Link from "next/link";
import type { ReactNode } from "react";
import { DemoBadge } from "../ui/badges";

/** Floating glass card around the hero node. Represents one real entity and links to it. */
export function Satellite({ type, href, title, meta, media, isDemo, width = 240 }: { type: string; href: string; title: string; meta: string; media: ReactNode; isDemo?: boolean; width?: number }) {
  return (
    <article className="glass group relative overflow-hidden p-3 transition-[transform,box-shadow] duration-700 hover:scale-[1.05] hover:shadow-[var(--glow-card)]" style={{ borderRadius: 20, width }}>
      <div className="overflow-hidden rounded-[14px]">{media}</div>
      <div className="px-1 pt-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow !text-[10.5px]">{type}</span>
          {isDemo && <DemoBadge className="!px-2 !py-0 !text-[10.5px]" />}
        </div>
        <h3 className="mt-1 truncate text-[15px] font-semibold">
          <Link href={href} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>
        <p className="truncate text-[12.5px] text-muted">{meta}</p>
      </div>
    </article>
  );
}
