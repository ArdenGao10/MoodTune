/*
 * YouTube Data API v3 —— 把「歌名 + 歌手」解析成可嵌入播放的视频。
 *
 * 匹配策略(关键):YouTube 搜索第一条往往是官方 MV(常禁止嵌入)、
 * 翻唱、或综艺片段。这里改为对前若干条结果打分:
 *  - 强烈优先「歌手名 - Topic」频道 —— YouTube 自动生成的官方音频频道,
 *    一定可嵌入、是正版音频,缩略图即专辑封面;
 *  - 惩罚标题里的 cover / instrumental / live / 综艺 等噪音;
 *  - 限定音乐分类(videoCategoryId=10),排除电视/综艺片段。
 *
 * 配额提醒:search.list 每次 100 单位,免费额度 10000/天 ≈ 100 次/天。
 */

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export interface YouTubeMatch {
  videoId: string;
  /** 视频缩略图 —— Topic 频道的即专辑封面 */
  thumbnailUrl: string;
}

/** 是否已配置 API key */
export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/** 标题里出现这些词 → 大概率不是想要的正版音频 */
const JUNK_RE =
  /\b(cover|covered|instrumental|remix|nightcore|slowed|sped\s*up|karaoke|reaction|reacts?|tutorial|lesson|mashup|8\s*bit|loop|1\s*hour)\b/i;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** want 的 token 有多少比例出现在 have 里(0–1) */
function coverage(want: string[], have: string[]): number {
  if (want.length === 0) return 0;
  const set = new Set(have);
  return want.filter((t) => set.has(t)).length / want.length;
}

interface RawSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

/**
 * 用「歌名 + 歌手」搜出最合适的可播放视频。找不到返回 null。
 * query 推荐传 `${title} ${artist}`。
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
    // 只要可嵌入网页播放的 —— 直接排除禁止嵌入的官方 MV
    videoEmbeddable: "true",
    // 限定「音乐」分类 —— 排除综艺 / 电视片段
    videoCategoryId: "10",
    maxResults: "15",
    q,
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`YouTube search ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { items?: RawSearchItem[] };
  const items = data.items ?? [];
  const queryTokens = tokenize(q);

  let best: RawSearchItem | null = null;
  let bestScore = -Infinity;
  for (const item of items) {
    if (!item.id?.videoId) continue;
    const channel = item.snippet?.channelTitle ?? "";
    const videoTitle = item.snippet?.title ?? "";

    // query 的词有多少落在「视频标题 + 频道名」里 —— 基础匹配度
    let score = coverage(queryTokens, tokenize(`${videoTitle} ${channel}`));
    // 「歌手 - Topic」官方音频频道 —— 最优
    if (/-\s*topic$/i.test(channel)) score += 1.5;
    else if (/\bofficial\b/i.test(channel)) score += 0.4;
    // 翻唱 / 现场 / 综艺等噪音 —— 扣分
    if (JUNK_RE.test(videoTitle)) score -= 1.5;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best?.id?.videoId) return null;
  const thumbs = best.snippet?.thumbnails;
  return {
    videoId: best.id.videoId,
    thumbnailUrl:
      thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "",
  };
}
