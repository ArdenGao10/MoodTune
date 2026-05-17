/*
 * <IconButton /> —— 功能控件用的精准描边圆按钮。
 *
 * 视觉层次原则：
 *  - 装饰元素（唱片、外圈 doodle、进度条）= 手绘风（rough.js）
 *  - 功能控件（按钮、菜单）= 精准描边 —— 即本组件
 * 不使用 rough.js，没有任何 roughness。
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮内的图标 */
  icon: ReactNode;
  /** 无障碍标签 */
  ariaLabel: string;
  /** sm = 32px，md = 40px（默认） */
  size?: "sm" | "md";
}

export function IconButton({
  icon,
  ariaLabel,
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "border border-mt-stroke bg-transparent text-mt-fg",
        "transition-colors duration-200 hover:border-mt-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-strong",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
