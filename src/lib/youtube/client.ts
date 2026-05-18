/*
 * YouTube Data API v3 —— 用关键词搜出可嵌入播放的视频。
 * 把 GLM 推荐的「歌名 + 歌手」解析成一个 YouTube videoId,
 * 交给 <YouTubePlaybackEngine> 当音频引擎播放。
 *
 * 配额提醒:search.list 每次消耗 100 单位,免费额度 10000/天 → 约 100 次/天。
 * 调用方(PlaybackProvider)对结果做了内存缓存,避免重复搜索。
 */

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export interface YouTubeMatch {
  videoId: string;
  title: string;
  channelTitle: string;
}

/** 是否已配置 API key —— 路由据此返回友好错误 */
export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/**
 * 用关键词搜歌,返回第一个可嵌入的视频。query 推荐传 `${title} ${artist}`。
 * 找不到返回 null;网络/配额等错误抛出,由路由处理。
 */
export async function searchYouTubeVideo(
  query: string,
): Promise<YouTubeMatch | null> {
  const key = process.env.YOUTUBE_API_KEY;
  const q = query.trim();
  if (!key || !q) return null;

  const params = new URLSearchParams({
    key,
    part: "snippet",
    type: "video",
    // 只要能嵌入网页播放的视频 —— 否则引擎放不了
    videoEmbeddable: "true",
    maxResults: "5",
    q,
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`YouTube search ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    items?: {
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }[];
  };

  for (const item of data.items ?? []) {
    const videoId = item.id?.videoId;
    if (videoId) {
      return {
        videoId,
        title: item.snippet?.title ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
      };
    }
  }
  return null;
}
