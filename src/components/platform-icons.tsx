/*
 * 跨平台跳转用的品牌图标。
 * Spotify / YouTube Music 用各自官方 logo 的路径；Apple Music / 网易云 /
 * QQ 音乐用统一风格的品牌色「app 图标」（圆角方 + 白色音符），视觉一致。
 */

export type PlatformKey =
  | "spotify"
  | "appleMusic"
  | "youtubeMusic"
  | "netease"
  | "qqMusic";

/** 跳转按钮上显示的平台名 */
export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtubeMusic: "YouTube Music",
  netease: "网易云",
  qqMusic: "QQ 音乐",
};

/** 5 个跳转平台的固定顺序 */
export const PLATFORM_ORDER: PlatformKey[] = [
  "spotify",
  "appleMusic",
  "youtubeMusic",
  "netease",
  "qqMusic",
];

const SPOTIFY_PATH =
  "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";

const YT_MUSIC_PATH =
  "M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z";

/** 品牌色「app 图标」—— 圆角方块 + 白色音符 */
function BrandSquare({ color }: { color: string }) {
  return (
    <>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill={color} />
      <g fill="#fff">
        <rect x="13.1" y="6" width="1.8" height="9.6" rx="0.9" />
        <path d="M14 6.1c2.7.7 4.1 2.2 4.1 4.5 0-1.7-1.4-3-4.1-3.6z" />
        <ellipse
          cx="10.4"
          cy="15.4"
          rx="3.3"
          ry="2.7"
          transform="rotate(-18 10.4 15.4)"
        />
      </g>
    </>
  );
}

export interface PlatformIconProps {
  platform: PlatformKey;
  size?: number;
}

/** 单个平台的品牌图标 */
export function PlatformIcon({ platform, size = 18 }: PlatformIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      {platform === "spotify" && <path d={SPOTIFY_PATH} fill="#1DB954" />}
      {platform === "youtubeMusic" && <path d={YT_MUSIC_PATH} fill="#FF0000" />}
      {platform === "appleMusic" && <BrandSquare color="#FA243C" />}
      {platform === "netease" && <BrandSquare color="#C20C0C" />}
      {platform === "qqMusic" && <BrandSquare color="#31C27C" />}
    </svg>
  );
}
