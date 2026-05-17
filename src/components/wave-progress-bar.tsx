"use client";

/*
 * <WaveProgressBar /> —— 手绘风进度条。
 * 一条粗糙的横线贯穿（未播放），已播放部分用前景色覆盖；下方左右显示时间。
 * 颜色取自主题变量，切换主题时重绘。
 */

import { useEffect, useRef } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

export interface WaveProgressBarProps {
  /** 播放进度 0–1 */
  progress?: number;
  currentTime?: string;
  totalTime?: string;
  className?: string;
}

const W = 400;
const H = 24;
const X0 = 8;
const X1 = 392;
const Y = 12;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function WaveProgressBar({
  progress = 0,
  currentTime = "0:00",
  totalTime = "0:00",
  className,
}: WaveProgressBarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const border = cssVar("--border");
    const accent = cssVar("--accent");
    const playedX = X0 + clamped * (X1 - X0);

    // 完整轨道（未播放）
    svg.appendChild(
      rc.line(X0, Y, X1, Y, {
        stroke: border,
        strokeWidth: 1,
        roughness: 1,
        bowing: 1.5,
      }),
    );
    // 已播放部分
    if (playedX > X0 + 0.5) {
      svg.appendChild(
        rc.line(X0, Y, playedX, Y, {
          stroke: accent,
          strokeWidth: 1.5,
          roughness: 0.8,
          bowing: 2,
        }),
      );
    }
  }, [clamped, theme]);

  return (
    <div className={cn("w-full", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-6 w-full"
        aria-hidden="true"
      />
      <div className="mt-1.5 flex justify-between text-[11px] font-medium tracking-[0.1em] tabular-nums text-mt-muted">
        <span>{currentTime}</span>
        <span>{totalTime}</span>
      </div>
    </div>
  );
}
