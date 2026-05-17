"use client";

/*
 * <RoughButton /> —— 手绘风格的圆形按钮。
 *  - 边框 / 填充用 roughjs 绘制，粗糙不完美。
 *  - hover 时描边变粗（预先画好普通 / 加粗两版，用透明度切换）。
 *  - variant="solid"：实心填充圆（用于 play 按钮）；"outline"：描边圆。
 *  - 颜色读取主题 CSS 变量，切换主题时自动重绘。
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

export interface RoughButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮直径（px） */
  size?: number;
  variant?: "outline" | "solid";
  /** 选中态：持续显示加粗描边（用于单选 / 多选的圆形控件） */
  selected?: boolean;
  /** hover 时加粗描边用强调色（而非默认的 border-strong） */
  accentHover?: boolean;
  children: ReactNode;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function RoughButton({
  size = 40,
  variant = "outline",
  selected = false,
  accentHover = false,
  children,
  className,
  type = "button",
  ...props
}: RoughButtonProps) {
  const normalRef = useRef<SVGGElement>(null);
  const boldRef = useRef<SVGGElement>(null);
  const uid = useId().replace(/:/g, "");
  const { theme } = useTheme();

  useEffect(() => {
    const normal = normalRef.current;
    const bold = boldRef.current;
    if (!normal || !bold) return;
    normal.replaceChildren();
    bold.replaceChildren();

    const svg = normal.ownerSVGElement;
    if (!svg) return;
    const rc = rough.svg(svg);

    const diameter = size - 6;
    const seed = 100 + (uid.charCodeAt(uid.length - 1) || 7);
    const fg = cssVar("--fg");
    const border = cssVar("--border");
    const strong = accentHover ? cssVar("--accent") : cssVar("--border-strong");

    if (variant === "solid") {
      normal.appendChild(
        rc.circle(size / 2, size / 2, diameter, {
          fill: fg,
          fillStyle: "solid",
          stroke: fg,
          strokeWidth: 1.2,
          roughness: 1.4,
          seed,
        }),
      );
      bold.appendChild(
        rc.circle(size / 2, size / 2, diameter, {
          fill: fg,
          fillStyle: "solid",
          stroke: fg,
          strokeWidth: 2.6,
          roughness: 1.4,
          seed,
        }),
      );
    } else {
      normal.appendChild(
        rc.circle(size / 2, size / 2, diameter, {
          stroke: border,
          strokeWidth: 1.3,
          roughness: 1.3,
          bowing: 1,
          seed,
        }),
      );
      bold.appendChild(
        rc.circle(size / 2, size / 2, diameter, {
          stroke: strong,
          strokeWidth: 2.4,
          roughness: 1.3,
          bowing: 1,
          seed,
        }),
      );
    }
  }, [size, variant, uid, theme, accentHover]);

  return (
    <button
      type={type}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center rounded-full",
        "transition-transform duration-200 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-strong",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <g
          ref={normalRef}
          className={cn(
            "transition-opacity duration-200",
            selected ? "opacity-0" : "group-hover:opacity-0",
          )}
        />
        <g
          ref={boldRef}
          className={cn(
            "transition-opacity duration-200",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
      </svg>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center",
          variant === "solid" ? "text-mt-bg" : "text-mt-fg",
        )}
      >
        {children}
      </span>
    </button>
  );
}
