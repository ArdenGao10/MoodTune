"use client";

/*
 * <ThemeToggle /> —— 主题切换按钮。暗色显示月亮、亮色显示太阳。
 */

import { Moon, Sun } from "lucide-react";
import { IconButton } from "./ui/IconButton";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconButton
      onClick={toggleTheme}
      ariaLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      icon={
        isDark ? (
          <Moon className="size-4" strokeWidth={1.6} />
        ) : (
          <Sun className="size-4" strokeWidth={1.6} />
        )
      }
    />
  );
}
