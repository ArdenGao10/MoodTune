/*
 * Demo Mode 的 mock 歌曲池。
 * 风格覆盖华语 indie / K-pop（有质感的那种）/ city pop —— 与 DJ 提示词的
 * 口味一致。每次 getRecommendations() 从中随机抽 3 首。
 *
 * 关于 previewUrl：这里填的是「示例」用的 Spotify preview CDN（p.scdn.co）
 * 链接，仅用于让 Demo 流程有可挂载的字段。真实可播的 preview URL 需在接入
 * Spotify 后由 searchTrack() 返回 —— 下一阶段做播放时再替换为真链接。
 *
 * albumArt 一律为 null：Demo 下由 <BrandCover /> SVG 占位。
 */

import type { Track } from "@/lib/types";

export const MOCK_TRACKS: Track[] = [
  {
    id: "mock-accidental-lovers",
    title: "爱人錯過",
    artist: "告五人",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-accidental-lovers",
    djNote: "华语 indie 的体温刚好——不黏人，但会陪你坐到很晚。",
  },
  {
    id: "mock-sea-waves",
    title: "海浪",
    artist: "Deca Joins",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-sea-waves",
    djNote: "吉他像退潮一样慢慢散开，适合一个人发呆的下午。",
  },
  {
    id: "mock-spend-holiday",
    title: "陪你過假日",
    artist: "9m88",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-spend-holiday",
    djNote: "慵懒到骨子里的一首，像周日早上还赖在床上的那种心情。",
  },
  {
    id: "mock-my-jinji",
    title: "My Jinji",
    artist: "Sunset Rollercoaster",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-my-jinji",
    djNote: "落日飞车的招牌迷幻 city pop，听完整个人都泡进暖光里。",
  },
  {
    id: "mock-square",
    title: "Square (2017)",
    artist: "Yerin Baek",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-square",
    djNote: "白艺潾的声音有故事感——不是偶像 K-pop，是会让你安静下来那种。",
  },
  {
    id: "mock-instagram",
    title: "instagram",
    artist: "DEAN",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-instagram",
    djNote: "深夜刷手机的孤独被他唱得很好看，留了一扇窗那种。",
  },
  {
    id: "mock-plastic-love",
    title: "Plastic Love",
    artist: "Mariya Takeuchi",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-plastic-love",
    djNote: "city pop 的教科书，霓虹味十足，适合开车经过一整座城市。",
  },
  {
    id: "mock-ride-on-time",
    title: "Ride On Time",
    artist: "Tatsuro Yamashita",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-ride-on-time",
    djNote: "山下達郎的阳光感是会传染的，心情低的时候放它准没错。",
  },
  {
    id: "mock-beautiful",
    title: "Beautiful",
    artist: "Crush",
    albumArt: null,
    source: "mock",
    previewUrl: "https://p.scdn.co/mp3-preview/mock-beautiful",
    djNote: "Crush 的暖,不是甜腻的那种,是那种「今天也还好啦」的暖。",
  },
];

/**
 * 随机抽 count 首 mock track（Fisher–Yates 洗牌）。
 * 默认抽 3 首，对应一次推荐的播放列表长度。
 */
export function pickMockTracks(count = 3): Track[] {
  const pool = [...MOCK_TRACKS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
