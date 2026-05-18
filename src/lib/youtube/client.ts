/*
 * YouTube Data API v3 —— 把「歌名 + 歌手」解析成可嵌入播放的视频候选。
 *
 * 匹配策略(关键):YouTube 搜索第一条往往是官方 MV(常禁止嵌入)、
 * 翻唱、或综艺片段。这里:
 *  1. 对前 15 条结果打分 —— 强烈优先「歌手名 - Topic」官方音频频道,
 *     惩罚 cover / instrumental / live 等噪音,限定音乐分类;
 *  2. 取打分前几名,用 videos.list 核实 status.embeddable
 *     —— search 的 videoEmbeddable 参数并不可靠;
 *  3. 返回多个候选(已排序)—— 播放层遇到某个放不了时可顺位换下一个,
 *     显著减少「Couldn't find this one to stream」。
 *
 * 配额提醒:search.list 100 单位、videos.list 1 单位;免费额度 10000/天。
 */

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export interface YouTubeCandidate {
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

/** 给一条搜索结果打分 —— 越高越像「想要的正版音频」 */
function scoreItem(item: RawSearchItem, queryTokens: string[]): number {
  const channel = item.snippet?.channelTitle ?? "";
  const videoTitle = item.snippet?.title ?? "";
  // query 的词有多少落在「视频标题 + 频道名」里
  let score = coverage(queryTokens, tokenize(`${videoTitle} ${channel}`));
  if (/-\s*topic$/i.test(channel)) score += 1.5; // 官方音频频道
  else if (/\bofficial\b/i.test(channel)) score += 0.4;
  if (JUNK_RE.test(videoTitle)) score -= 1.5; // 翻唱 / 现场等噪音
  return score;
}

function thumbnailOf(item: RawSearchItem): string {
  const t = item.snippet?.thumbnails;
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? "";
}

/** 用 videos.list 查出这批 id 里哪些真的可嵌入 */
async function fetchEmbeddableSet(
  ids: string[],
  key: string,
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  try {
    const params = new URLSearchParams({
      key,
      part: "status",
      id: ids.join(","),
    });
    const res = await fetch(`${VIDEOS_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Set();
    const data = (await res.json()) as {
      items?: { id?: string; status?: { embeddable?: boolean } }[];
    };
    const set = new Set<string>();
    for (const item of data.items ?? []) {
      if (item.id && item.status?.embeddable) set.add(item.id);
    }
    return set;
  } catch {
    return new Set();
  }
}

/**
 * 用「歌名 + 歌手」搜出一组可播放的候选视频(已按匹配度排序)。
 * 找不到返回空数组。query 推荐传 `${title} ${artist}`。
 */
export async function searchYouTubeVideos(
  query: string,
): Promise<YouTubeCandidate[]> {
  const key = process.env.YOUTUBE_API_KEY;
  const q = query.trim();
  if (!key || !q) return [];

  const params = new URLSearchParams({
    key,
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10", // 音乐分类
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
  const queryTokens = tokenize(q);

  // 打分排序,取前 8 名进入可嵌入核实
  const ranked = (data.items ?? [])
    .filter((it) => it.id?.videoId)
    .map((it) => ({ it, score: scoreItem(it, queryTokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  if (ranked.length === 0) return [];

  const embeddable = await fetchEmbeddableSet(
    ranked.map((r) => r.it.id!.videoId!),
    key,
  );

  const candidates: YouTubeCandidate[] = [];
  for (const { it } of ranked) {
    const videoId = it.id!.videoId!;
    // 核实成功时只留可嵌入的;核实失败(空集)则不过滤
    if (embeddable.size > 0 && !embeddable.has(videoId)) continue;
    candidates.push({ videoId, thumbnailUrl: thumbnailOf(it) });
    if (candidates.length >= 5) break;
  }
  // 万一全被过滤掉,退回打分前几名,至少给出候选
  if (candidates.length === 0) {
    for (const { it } of ranked.slice(0, 5)) {
      candidates.push({
        videoId: it.id!.videoId!,
        thumbnailUrl: thumbnailOf(it),
      });
    }
  }
  return candidates;
}
