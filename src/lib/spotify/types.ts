/*
 * Spotify 数据层共享类型。
 * SpotifyTrack —— Spotify API 返回的单曲（应用内统一只取需要的字段）。
 * SpotifyUser  —— /me 返回的当前用户（product 字段决定是否走 Real Mode）。
 */

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
};

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email: string;
  /** "premium" | "free" | "open" —— 仅 premium 可走 Real Mode 真实播放 */
  product: string;
  images: { url: string }[];
}

/** /api/me 的响应体 */
export interface MeResponse {
  user: SpotifyUser | null;
}
