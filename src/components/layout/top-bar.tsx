"use client";

/*
 * <TopBar /> —— 共享顶栏。
 *  默认：+ 按钮 + 天气占位 ｜ NOW PLAYING 标签 ｜ 主题切换 + 菜单
 *  首页 /：左侧留白 ｜ 右侧"此刻时空"状态行 + 主题切换
 */

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { NowPlayingBadge } from "../now-playing-badge";
import { ThemeToggle } from "../theme-toggle";
import { SpotifyAuthButton } from "../spotify-auth-button";
import { NavMenu } from "./nav-menu";
import { WeatherWidget } from "./weather-widget";
import { HomeStatus } from "./home-status";

export function TopBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <header className="relative z-10 mb-[50px] flex items-center justify-between gap-4 md:mb-[30px]">
        {/* 左：站点品牌名（印刷粗体 + 手写批注） */}
        <span className="flex items-baseline gap-2">
          <span className="text-[17px] font-black uppercase tracking-[0.15em] text-mt-fg sm:text-[20px] lg:text-[26px]">
            MoodTune
          </span>
          <span className="hidden font-hand text-[15px] text-mt-fg sm:inline lg:text-[20px]">
            — Side A
          </span>
        </span>
        {/* 右：状态区 + 主题切换 */}
        <div className="flex items-center gap-4">
          <HomeStatus />
          {/* 临时：Spotify 登录测试按钮（阶段 1 验收用） */}
          <SpotifyAuthButton />
          <ThemeToggle />
        </div>
      </header>
    );
  }

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
        {/* 临时：Spotify 登录测试按钮（阶段 1 验收用） */}
        <SpotifyAuthButton />
        <ThemeToggle />
        <NavMenu />
      </div>
    </header>
  );
}
