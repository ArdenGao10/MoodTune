/*
 * 客户端用的 YouTube 解析助手 —— 把「歌名 歌手」解析成候选视频。
 * 进程内按 query 缓存 Promise：发现卡的封面回填与 30s 试听共用同一次请求，
 * 不重复消耗 YouTube 配额。
 */

import type { YouTubeCandidate } from "@/lib/youtube/client";
import type { YouTubeSearchResponse } from "@/app/api/youtube/search/route";

const cache = new Map<string, Promise<YouTubeCandidate[]>>();

/** 解析一首歌的 YouTube 候选（已按匹配度排序）。失败 / 无结果返回空数组。 */
export function resolveYouTube(
  title: string,
  artist: string,
): Promise<YouTubeCandidate[]> {
  const q = `${title} ${artist}`.trim();
  let pending = cache.get(q);
  if (!pending) {
    pending = fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json() as Promise<YouTubeSearchResponse>)
      .then((data) => data.candidates ?? [])
      .catch(() => [] as YouTubeCandidate[]);
    cache.set(q, pending);
  }
  return pending;
}
