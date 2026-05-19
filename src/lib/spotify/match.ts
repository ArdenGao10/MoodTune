/*
 * GLM 推荐 → 统一 Track 的匹配管线。
 * 对每条 GLM 推荐尝试在 Spotify 搜歌：
 *  - 匹配成功 → source: 'spotify'（带 spotifyId / spotifyUri / 封面 / preview）
 *  - 匹配失败 → source: 'recommendation'（仍可走跨平台搜索跳转去发现）
 * 关键：匹配失败不再产生「死路径」—— 每首歌永远是「可发现的」。
 */

import type { Recommendation, Track } from "@/lib/types";
import { searchTrack } from "./client";

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
    // 单首匹配失败不应拖垮整组 —— 降级为 recommendation
    console.warn("spotify match failed for", rec.title, error);
  }

  if (spotify) {
    return {
      id: spotify.id,
      title: spotify.name,
      artist: spotify.artists.map((a) => a.name).join(", "),
      album: spotify.album.name,
      albumArt: spotify.album.images[0]?.url ?? null,
      moodTag: rec.moodTag,
      source: "spotify",
      spotifyId: spotify.id,
      spotifyUri: spotify.uri,
      previewUrl: spotify.preview_url ?? undefined,
      djNote: rec.note,
    };
  }

  // 没匹配上 —— 仍是一首「可发现」的歌，靠跨平台跳转
  return {
    id: internalId(rec.title, rec.artist),
    title: rec.title,
    artist: rec.artist,
    albumArt: null,
    moodTag: rec.moodTag,
    source: "recommendation",
    djNote: rec.note,
  };
}

/** 并发匹配整组推荐 */
export function matchRecommendationsToTracks(
  recommendations: Recommendation[],
): Promise<Track[]> {
  return Promise.all(recommendations.map(recommendationToTrack));
}
