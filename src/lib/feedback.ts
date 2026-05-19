/*
 * 歌曲反馈的本地存储层 —— ♡ / 🤷 / 🚫 三态。
 * 当前仅做 UI + localStorage，后续真实反馈循环再消费这些数据。
 */

import type { FeedbackEntry, FeedbackKind } from "@/lib/types";

const KEY = "moodtune-feedback";

/** 读出全部反馈记录（损坏 / 缺失时返回空数组） */
export function readFeedback(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

/** 取某首歌当前的反馈，无则 null */
export function getFeedback(trackId: string): FeedbackKind | null {
  return readFeedback().find((e) => e.trackId === trackId)?.feedback ?? null;
}

/**
 * 设置某首歌的反馈。再次点击同一项 → 取消（返回 null）。
 * 返回设置后的状态，供 UI 立即同步。
 */
export function setFeedback(
  trackId: string,
  feedback: FeedbackKind,
): FeedbackKind | null {
  if (typeof window === "undefined") return feedback;
  const entries = readFeedback().filter((e) => e.trackId !== trackId);
  const current = getFeedback(trackId);
  let next: FeedbackKind | null = feedback;
  if (current !== feedback) {
    entries.push({ trackId, feedback, timestamp: Date.now() });
  } else {
    next = null; // 点了同一项 —— 取消
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* 配额满 / 隐私模式 —— 静默忽略 */
  }
  return next;
}
