/*
 * GLM 推荐 → 统一 Track 的匹配管线。
 * 对每条 GLM 推荐尝试在 Spotify 搜歌：
 *  - 匹配成功 → source: 'spotify'（带 spotifyUri / previewUrl）
 *  - 匹配失败 → source: 'unplayable'（带三个外部搜索链接）
 */

import type { Recommendation, Track } from "@/lib/types";
import { searchTrack } from "./client";

/** 给 unplayable 歌曲生成三个外部平台的搜索链接 */
export function buildExternalSearchUrls(
  title: string,
  artist: string,
): NonNullable<Track["externalSearchUrls"]> {
  const q = encodeURIComponent(`${title} ${artist}`.trim());
  return {
    youtubeMusic: `https://music.youtube.com/search?q=${q}`,
    appleMusic: `https://music.apple.com/cn/search?term=${q}`,
    spotifySearch: `https://open.spotify.com/search/${q}`,
  };
}

/** 由 title + artist 生成稳定的内部 ID */
function internalId(title: string, artist: string): string {
  const slug = `${title}-${artist}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `rec-${slug || "track"}`;
}

async function recommendationToTrack(rec: Recommendation): Promise<Track> {
  let spotify = null;
  try {
    spotify = await searchTrack(`${rec.title} ${rec.artist}`);
  } catch (error) {
    // 单首匹配失败不应拖垮整组 —— 降级为 unplayable
    console.warn("spotify match failed for", rec.title, error);
  }

  if (spotify) {
    return {
      id: spotify.id,
      title: spotify.name,
      artist: spotify.artists.map((a) => a.name).join(", "),
      albumArt: spotify.album.images[0]?.url ?? null,
      source: "spotify",
      spotifyUri: spotify.uri,
      previewUrl: spotify.preview_url ?? undefined,
      djNote: rec.note,
    };
  }

  return {
    id: internalId(rec.title, rec.artist),
    title: rec.title,
    artist: rec.artist,
    albumArt: null,
    source: "unplayable",
    externalSearchUrls: buildExternalSearchUrls(rec.title, rec.artist),
    djNote: rec.note,
  };
}

/** 并发匹配整组推荐 */
export function matchRecommendationsToTracks(
  recommendations: Recommendation[],
): Promise<Track[]> {
  return Promise.all(recommendations.map(recommendationToTrack));
}
