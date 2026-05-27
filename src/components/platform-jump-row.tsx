/*
 * 跨平台跳转按钮组 —— MoodTune 不托管音乐：挑歌之后用户自己选去哪里听。
 * 一行 5 个品牌图标，点击在新标签页打开对应平台的歌曲页 / 搜索页。
 *
 * 使用场景：放在歌曲卡片或主播放区里。卡片本身常是可点的（如 RecCard），
 * 所以这里对每个链接做 stopPropagation，避免触发父级点击。
 */

import type { MouseEvent } from "react";
import { buildSearchLinks } from "@/lib/external-links";
import {
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  PlatformIcon,
} from "@/components/platform-icons";
import { cn } from "@/lib/utils";

interface PlatformJumpRowProps {
  title: string;
  artist: string;
  /** 已匹配到 Spotify 时传入 —— 直达曲目页而非搜索页 */
  spotifyId?: string;
  /** 图标尺寸 */
  size?: number;
  /** 额外 className（用于位置 / 间距微调） */
  className?: string;
}

export function PlatformJumpRow({
  title,
  artist,
  spotifyId,
  size = 18,
  className,
}: PlatformJumpRowProps) {
  const links = buildSearchLinks(title, artist, spotifyId);
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {PLATFORM_ORDER.map((platform) => (
        <a
          key={platform}
          href={links[platform]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          aria-label={`Open in ${PLATFORM_LABELS[platform]}`}
          title={PLATFORM_LABELS[platform]}
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          <PlatformIcon platform={platform} size={size} />
        </a>
      ))}
    </div>
  );
}
