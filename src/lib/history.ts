/*
 * 收听历史 —— 本地持久化层(localStorage)。
 *
 * 每完成一次「情绪 → 推荐」会被存一条记录。历史日历与月度回顾都读这里。
 * 选用 localStorage:当前阶段没有部署、没有真实账号体系,localStorage
 * 零配置即可用;将来要跨设备再迁后端。
 *
 * 图片(imageBase64)不入库 —— data URL 体积大,会很快撑爆 localStorage。
 */

import type { MoodInput, Recommendation } from "./types";

/** 一次完成的「情绪 → 推荐」会话 */
export interface MoodSessionRecord {
  id: string;
  /** 保存时间,ISO 字符串 */
  savedAt: string;
  moodTags: string[];
  moodText: string;
  colorEmoji: string;
  weatherEmoji: string;
  recommendations: Recommendation[];
  /** 头号推荐曲的专辑封面 —— 播放解析出来后回填,用作历史日历的格子封面 */
  coverArt?: string | null;
}

const STORAGE_KEY = "moodtune-history";

/** 最近存下的会话 id —— 供 updateLatestSessionCover 回填封面 */
let latestSessionId: string | null = null;

function read(): MoodSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MoodSessionRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: MoodSessionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* localStorage 满 / 被禁用 —— 静默忽略 */
  }
}

/** 全部会话,按时间倒序(最新在前) */
export function getAllSessions(): MoodSessionRecord[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/* ---------- useSyncExternalStore 用的轻量 store ---------- */

let snapshotCache: MoodSessionRecord[] | null = null;
const listeners = new Set<() => void>();
const EMPTY_SNAPSHOT: MoodSessionRecord[] = [];

/** 订阅历史变化(saveSession 后会通知) */
export function subscribeSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 当前快照 —— 数据不变时返回同一引用,供 useSyncExternalStore 使用 */
export function getSessionsSnapshot(): MoodSessionRecord[] {
  if (snapshotCache === null) snapshotCache = getAllSessions();
  return snapshotCache;
}

/** SSR 快照 —— 服务端没有 localStorage */
export function getServerSessionsSnapshot(): MoodSessionRecord[] {
  return EMPTY_SNAPSHOT;
}

/** 存一条会话。返回存下的记录。 */
export function saveSession(
  input: Pick<
    MoodInput,
    "moodTags" | "moodText" | "colorEmoji" | "weatherEmoji"
  >,
  recommendations: Recommendation[],
): MoodSessionRecord {
  const record: MoodSessionRecord = {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
    moodTags: input.moodTags ?? [],
    moodText: input.moodText ?? "",
    colorEmoji: input.colorEmoji ?? "",
    weatherEmoji: input.weatherEmoji ?? "",
    recommendations,
  };
  write([record, ...read()]);
  latestSessionId = record.id;
  // 让快照失效并通知订阅者
  snapshotCache = null;
  for (const listener of listeners) listener();
  return record;
}

/** 给最近一次会话回填封面(头号推荐曲的专辑封面) */
export function updateLatestSessionCover(coverArt: string): void {
  if (!latestSessionId || !coverArt) return;
  const records = read();
  const record = records.find((r) => r.id === latestSessionId);
  if (!record || record.coverArt === coverArt) return;
  record.coverArt = coverArt;
  write(records);
  snapshotCache = null;
  for (const listener of listeners) listener();
}

/** 本地日期键 YYYY-MM-DD(按用户本地时区) */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 本地月份键 YYYY-MM(按用户本地时区) */
export function localMonthKey(iso: string): string {
  return localDateKey(iso).slice(0, 7);
}

/** 取某月(YYYY-MM)的会话,倒序 */
export function getSessionsForMonth(month: string): MoodSessionRecord[] {
  return getAllSessions().filter((s) => localMonthKey(s.savedAt) === month);
}
