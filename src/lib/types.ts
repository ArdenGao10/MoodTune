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

/** /api/recommend 的响应体 */
export interface RecommendResponse {
  recommendations?: Recommendation[];
  error?: string;
}
