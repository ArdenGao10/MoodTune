/*
 * <TopBar /> —— 共享顶栏。
 *  左：+ 按钮 + 天气占位 ｜ 中：NOW PLAYING 标签 ｜ 右：主题切换 + 菜单
 */

import { Plus } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { NowPlayingBadge } from "../now-playing-badge";
import { ThemeToggle } from "../theme-toggle";
import { NavMenu } from "./nav-menu";
import { WeatherWidget } from "./weather-widget";

export function TopBar() {
  return (
    <header className="mb-[50px] flex items-center justify-between gap-3 md:mb-[30px]">
      {/* 左 */}
      <div className="flex flex-1 items-center gap-3">
        <IconButton
          ariaLabel="Add to playlist"
          icon={<Plus className="size-4" strokeWidth={1.7} />}
        />
        <div className="hidden sm:block">
          <WeatherWidget />
        </div>
      </div>

      {/* 中 */}
      <NowPlayingBadge />

      {/* 右 */}
      <div className="flex flex-1 items-center justify-end gap-3">
        <ThemeToggle />
        <NavMenu />
      </div>
    </header>
  );
}
