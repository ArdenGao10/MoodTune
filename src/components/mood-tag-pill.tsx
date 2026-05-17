"use client";

/*
 * <MoodTagPill /> —— 情绪标签。受控的选中态：选中时反色填充。
 */

import { cn } from "@/lib/utils";

export interface MoodTagPillProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function MoodTagPill({
  label,
  selected = false,
  disabled = false,
  onClick,
}: MoodTagPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled && !selected}
      className={cn(
        "rounded-full border px-4 py-2 text-[13px] transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-strong",
        selected
          ? "border-accent bg-accent text-white"
          : "border-mt-stroke text-mt-fg hover:border-mt-strong",
        disabled && !selected && "cursor-not-allowed opacity-40 hover:border-mt-stroke",
      )}
    >
      {label}
    </button>
  );
}
