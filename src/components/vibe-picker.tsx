"use client";

/*
 * <VibePicker /> —— 情绪输入 C：「PICK A VIBE」。
 * 两行选项（颜色 / 天气），每行单选。
 * 选项圈是精准 CSS 描边圆（功能控件，不用 rough.js）：
 *   默认 1px var(--border)，选中 2px var(--accent)。
 * 颜色用纯色实心圆，天气用 lucide 线条图标 —— 不用彩色 emoji。
 */

import {
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const COLORS: { name: string; value: string }[] = [
  { name: "Red", value: "#E04020" },
  { name: "Orange", value: "#E89540" },
  { name: "Yellow", value: "#E8C547" },
  { name: "Green", value: "#5BA374" },
  { name: "Blue", value: "#5B8DA3" },
  { name: "Purple", value: "#8B5BA3" },
  { name: "Black", value: "#1a1a1a" },
  { name: "White", value: "#F0F0F0" },
];

const WEATHERS: { name: string; Icon: LucideIcon }[] = [
  { name: "Sunny", Icon: Sun },
  { name: "Partly cloudy", Icon: CloudSun },
  { name: "Rainy", Icon: CloudRain },
  { name: "Stormy", Icon: CloudLightning },
  { name: "Snowy", Icon: Snowflake },
  { name: "Foggy", Icon: CloudFog },
  { name: "Night", Icon: Moon },
];

export interface VibePickerProps {
  /** 选中的颜色名（如 "Blue"），未选为空串 */
  color: string;
  /** 选中的天气名（如 "Rainy"），未选为空串 */
  weather: string;
  onColorChange: (color: string) => void;
  onWeatherChange: (weather: string) => void;
}

function VibeChip({
  selected,
  ariaLabel,
  onClick,
  children,
}: {
  selected: boolean;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={cn(
        "flex size-12 items-center justify-center rounded-full bg-transparent transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-strong",
        selected
          ? "border-2 border-accent"
          : "border border-mt-stroke hover:border-mt-strong",
      )}
    >
      {children}
    </button>
  );
}

function VibeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[9px] font-medium uppercase tracking-[0.2em] text-mt-faint">
        {label}
      </p>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function VibePicker({
  color,
  weather,
  onColorChange,
  onWeatherChange,
}: VibePickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <VibeRow label="Color">
        {COLORS.map((c) => (
          <VibeChip
            key={c.name}
            selected={color === c.name}
            ariaLabel={`Color ${c.name}`}
            onClick={() => onColorChange(color === c.name ? "" : c.name)}
          >
            {/* 24px 纯色实心圆 */}
            <span
              className="size-6 rounded-full"
              style={{ backgroundColor: c.value }}
            />
          </VibeChip>
        ))}
      </VibeRow>

      <VibeRow label="Weather">
        {WEATHERS.map((w) => (
          <VibeChip
            key={w.name}
            selected={weather === w.name}
            ariaLabel={`Weather ${w.name}`}
            onClick={() => onWeatherChange(weather === w.name ? "" : w.name)}
          >
            <w.Icon className="size-5 text-mt-fg" strokeWidth={1.6} />
          </VibeChip>
        ))}
      </VibeRow>
    </div>
  );
}
