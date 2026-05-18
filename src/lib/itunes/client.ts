/*
 * iTunes Search API —— 免费、免 key、免授权的音乐元数据来源。
 *
 * 用途:GLM 推荐偶尔会把歌名和歌手配错(幻觉),且不带专辑封面。
 * 这里拿 GLM 的「歌名 + 歌手」去 iTunes 搜规范结果,校正歌手名、
 * 补上专辑封面。匹配不够可靠时宁可不改(保留 GLM 原值)。
 */

import type { Recommendation } from "@/lib/types";

const ITUNES_SEARCH = "https://itunes.apple.com/search";

export interface ITunesMatch {
  title: string;
  artist: string;
  album: string;
  /** 专辑封面 URL(已替换成高清尺寸) */
  artworkUrl: string;
}

interface RawITunesSong {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
}

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

/**
 * 用「歌名 + 歌手」在 iTunes 找最匹配的歌曲。
 * 标题对不上(可靠度过低)时返回 null —— 不乱改。
 */
export async function lookupITunes(
  title: string,
  artist: string,
): Promise<ITunesMatch | null> {
  const term = `${title} ${artist}`.trim();
  if (!term) return null;

  const params = new URLSearchParams({
    term,
    entity: "song",
    limit: "10",
  });

  let results: RawITunesSong[];
  try {
    const res = await fetch(`${ITUNES_SEARCH}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: RawITunesSong[] };
    results = data.results ?? [];
  } catch {
    return null;
  }

  const titleTokens = tokenize(title);
  const artistTokens = tokenize(artist);

  let best: RawITunesSong | null = null;
  let bestScore = 0;
  for (const r of results) {
    if (!r.trackName || !r.artistName) continue;
    const titleScore = coverage(titleTokens, tokenize(r.trackName));
    const artistScore = coverage(artistTokens, tokenize(r.artistName));
    // 标题权重更高 —— 它最能确认「是不是这首歌」
    const combined = titleScore * 0.65 + artistScore * 0.35;
    if (combined > bestScore) {
      bestScore = combined;
      best = r;
    }
  }

  // 标题明显对不上 → 视为没匹配到,保留 GLM 原值
  if (!best || bestScore < 0.5) return null;

  return {
    title: best.trackName!,
    artist: best.artistName!,
    album: best.collectionName ?? "",
    // artworkUrl100 形如 .../100x100bb.jpg —— 换成高清尺寸
    artworkUrl: (best.artworkUrl100 ?? "").replace(
      /\/\d+x\d+bb\./,
      "/600x600bb.",
    ),
  };
}

/**
 * 批量校正一组 GLM 推荐:命中 iTunes 则用规范的歌名/歌手 + 专辑封面,
 * 未命中则原样返回。note / moodTag 始终保留 GLM 的输出。
 */
export async function enrichWithITunes(
  recommendations: Recommendation[],
): Promise<Recommendation[]> {
  return Promise.all(
    recommendations.map(async (rec) => {
      const match = await lookupITunes(rec.title, rec.artist);
      if (!match) return rec;
      return {
        ...rec,
        title: match.title,
        artist: match.artist,
        albumArt: match.artworkUrl || null,
      };
    }),
  );
}
