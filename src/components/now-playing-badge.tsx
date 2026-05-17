/*
 * <NowPlayingBadge /> —— 胶囊形描边标签。全大写小字、宽字距。
 */

import { cn } from "@/lib/utils";

export interface NowPlayingBadgeProps {
  children?: React.ReactNode;
  className?: string;
}

export function NowPlayingBadge({
  children = "Now Playing",
  className,
}: NowPlayingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full border border-mt-stroke",
        "px-5 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-mt-fg",
        className,
      )}
    >
      {children}
    </span>
  );
}
