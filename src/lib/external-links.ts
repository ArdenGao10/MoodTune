/*
 * 跨平台跳转工具 —— MoodTune 是「音乐发现层」，不托管音乐：我们挑歌，
 * 用户自己选择在哪里播放。这里为每首歌生成各大音乐平台的跳转链接。
 *
 * 已有 Spotify 匹配（spotifyId）时，Spotify 链接直达曲目页；
 * 否则回落到 Spotify 站内搜索。其余平台一律走站内搜索。
 */

export interface ExternalLinks {
  spotify: string;
  appleMusic: string;
  youtubeMusic: string;
  netease: string;
  qqMusic: string;
}

/**
 * 为一首歌生成各平台跳转链接。
 * @param spotifyId 已匹配到 Spotify 时传入 —— Spotify 链接直达曲目页。
 */
export function buildSearchLinks(
  title: string,
  artist: string,
  spotifyId?: string,
): ExternalLinks {
  const query = encodeURIComponent(`${title} ${artist}`);
  return {
    spotify: spotifyId
      ? `https://open.spotify.com/track/${spotifyId}`
      : `https://open.spotify.com/search/${query}`,
    appleMusic: `https://music.apple.com/cn/search?term=${query}`,
    youtubeMusic: `https://music.youtube.com/search?q=${query}`,
    netease: `https://music.163.com/#/search/m/?s=${query}&type=1`,
    qqMusic: `https://y.qq.com/n/ryqq/search?w=${query}&t=song`,
  };
}

/** 把「歌名 - 歌手」复制到剪贴板 */
export async function copyTrackToClipboard(
  title: string,
  artist: string,
): Promise<void> {
  await navigator.clipboard.writeText(`${title} - ${artist}`);
}
