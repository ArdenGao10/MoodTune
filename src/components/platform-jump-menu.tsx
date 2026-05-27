"use client";

/*
 * 跨平台跳转触发按钮 —— 点击展开小卡片，露出 5 个品牌图标。
 *
 * 这么做的两个理由：
 *  1. 把 5 个高饱和品牌色「藏起来」，默认 UI 跟 MoodTune 的暖米调子一致。
 *  2. 用户点开按钮本身就是「我现在想去别处听」的明确意图 —— 此时显示原色
 *     反而有利于识别（绿圆点 = Spotify，红方块 = Apple，等等）。
 *
 * 实现细节：
 *  - 用 mt-bg 做卡片背景 + mt-stroke 描边，与全站 UI 一致。
 *  - mousedown 监听 + ref.contains 做 click-outside；Esc 关闭。
 *  - 组件外层 onClick 阻止冒泡，避免触发父级 RecCard 的 onSelect。
 */

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import { PlatformJumpRow } from "@/components/platform-jump-row";
import { cn } from "@/lib/utils";

interface PlatformJumpMenuProps {
  title: string;
  artist: string;
  /** 已匹配到 Spotify 时传入 —— Spotify 直达曲目页 */
  spotifyId?: string;
  /** default：带「Open in」文字的胶囊；compact：纯图标圆按钮 */
  variant?: "default" | "compact";
  /** 弹层对齐方向（默认 end / 右对齐） */
  align?: "start" | "end" | "center";
  className?: string;
}

export function PlatformJumpMenu({
  title,
  artist,
  spotifyId,
  variant = "default",
  align = "end",
  className,
}: PlatformJumpMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: globalThis.MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stop = (e: ReactMouseEvent) => e.stopPropagation();
  const alignClass =
    align === "start"
      ? "left-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0";

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      onClick={stop}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={variant === "compact" ? "Open in other apps" : undefined}
        className={
          variant === "compact"
            ? "flex size-8 items-center justify-center rounded-full border border-mt-stroke text-mt-muted transition-colors hover:border-mt-strong hover:text-mt-fg"
            : "flex items-center gap-1.5 rounded-full border border-mt-stroke px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-mt-muted transition-colors hover:border-mt-strong hover:text-mt-fg"
        }
      >
        {variant === "compact" ? (
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={1.7}
          />
        ) : (
          <>
            Open in
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={1.7}
            />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-20 mt-2 rounded-xl border border-mt-stroke bg-mt-bg px-3 py-2.5 shadow-lg shadow-black/15",
            alignClass,
          )}
        >
          <PlatformJumpRow
            title={title}
            artist={artist}
            spotifyId={spotifyId}
            size={20}
            className="gap-3"
          />
        </div>
      )}
    </div>
  );
}
