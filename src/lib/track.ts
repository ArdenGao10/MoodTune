/*
 * Recommendation → Track 的纯客户端兜底转换。
 * 当 /api/recommend 没能返回 tracks（如 Spotify 完全不可用）时，前端用它
 * 把原始推荐升格成统一 Track —— 保证发现卡片永远有数据可渲染。
 * 不含任何 Spotify 字段；服务端的 match.ts 才负责真实匹配。
 */

import type { Recommendation, Track } from "@/lib/types";

/** 由 title + artist 生成稳定的内部 ID */
export function internalTrackId(title: string, artist: string): string {
  const slug = `${title}-${artist}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `rec-${slug || "track"}`;
}

/** 单条推荐 → 未匹配 Spotify 的 Track */
export function recommendationToTrack(rec: Recommendation): Track {
  return {
    id: internalTrackId(rec.title, rec.artist),
    title: rec.title,
    artist: rec.artist,
    albumArt: null,
    moodTag: rec.moodTag,
    source: "recommendation",
    djNote: rec.note,
  };
}

/** 整组推荐 → Track[] */
export function recommendationsToTracks(recs: Recommendation[]): Track[] {
  return recs.map(recommendationToTrack);
}
