/*
 * MoodTune —— 跨前后端共享类型。
 */

/** 四种情绪输入的集合 */
export interface MoodInput {
  /** A. 情绪标签（最多 3 个） */
  moodTags: string[];
  /** B. 自由文字 */
  moodText: string;
  /** C. 颜色 emoji（单选） */
  colorEmoji: string;
  /** C. 天气 emoji（单选） */
  weatherEmoji: string;
  /** D. 图片，data URL 形式（data:image/...;base64,...） */
  imageBase64?: string;
}

/** 天气信息 */
export interface Weather {
  city: string;
  temp: number | null;
  condition: string;
  icon?: string;
}

/** 提交给 /api/recommend 的请求体 */
export interface RecommendRequest extends MoodInput {
  weather: Weather | null;
  /** 用户本地时间的可读字符串，例如 "Friday, 11:30 PM" */
  localTime?: string;
}

/** 单条歌曲推荐 */
export interface Recommendation {
  title: string;
  artist: string;
  note: string;
  moodTag: string;
}

/**
 * 应用内部统一的歌曲模型 —— 跨三种数据来源：
 *  - 'mock'       Demo Mode 的预设歌曲
 *  - 'spotify'    GLM 推荐已成功匹配到 Spotify
 *  - 'unplayable' GLM 推荐在 Spotify 没找到，只能给外部搜索链接
 * 上层 UI 只认这个类型，不关心数据从哪来。
 */
export interface Track {
  /** 内部 ID */
  id: string;
  title: string;
  artist: string;
  /** 专辑封面 URL；为 null 时 UI 用 <BrandCover /> SVG 占位 */
  albumArt: string | null;
  source: "mock" | "spotify" | "unplayable";
  /** source 为 'spotify' 时存在 —— 用于 Web Playback SDK */
  spotifyUri?: string;
  /** 30 秒试听片段，可能不存在 */
  previewUrl?: string;
  /** source 为 'unplayable' 时存在 —— 三个外部平台的搜索链接 */
  externalSearchUrls?: {
    youtubeMusic: string;
    appleMusic: string;
    spotifySearch: string;
  };
  /** DJ 的推荐语 */
  djNote: string;
}

/** /api/recommend 的响应体 */
export interface RecommendResponse {
  recommendations?: Recommendation[];
  /** 已登录（Real Mode）时附带 —— GLM 推荐匹配 Spotify 后的统一 Track */
  tracks?: Track[];
  error?: string;
}
