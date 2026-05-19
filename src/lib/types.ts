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
 * 应用内部统一的歌曲模型 —— MoodTune 是「音乐发现层」，每首歌都是
 * 「可发现的」，区别只在播放路径：
 *  - 'mock'           Demo Mode 的预设歌曲
 *  - 'spotify'        GLM 推荐已成功匹配到 Spotify（带封面 / preview / 直达链接）
 *  - 'recommendation' GLM 推荐未匹配到 Spotify —— 仍可通过跨平台搜索跳转发现
 * 上层 UI 只认这个类型，不关心数据从哪来。任何一首歌都不会出现死路径。
 */
export type TrackSource = "mock" | "spotify" | "recommendation";

export interface Track {
  /** 内部 ID */
  id: string;
  title: string;
  artist: string;
  /** 专辑名（Spotify 匹配成功时存在） */
  album?: string;
  /** 专辑封面 URL；为 null 时 UI 用 <BrandCover /> SVG 占位 */
  albumArt: string | null;
  /** 情绪标签 —— 来自 GLM 推荐 */
  moodTag?: string;
  source: TrackSource;
  /** Spotify 匹配成功时存在 —— 用于直达链接 */
  spotifyId?: string;
  /** Spotify 匹配成功时存在 —— 用于 Web Playback SDK 全曲播放 */
  spotifyUri?: string;
  /** 30 秒试听片段（Spotify public endpoint），可能不存在 */
  previewUrl?: string;
  /** DJ 的推荐语 */
  djNote: string;
}

/** 用户对单首歌的反馈 —— 暂存 localStorage */
export type FeedbackKind = "love" | "meh" | "skip";

export interface FeedbackEntry {
  trackId: string;
  feedback: FeedbackKind;
  timestamp: number;
}

/** /api/recommend 的响应体 */
export interface RecommendResponse {
  recommendations?: Recommendation[];
  /** 已登录（Real Mode）时附带 —— GLM 推荐匹配 Spotify 后的统一 Track */
  tracks?: Track[];
  error?: string;
}
