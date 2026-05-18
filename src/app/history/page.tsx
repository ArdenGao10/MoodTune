"use client";

/*
 * /history —— 收听历史日历。
 * 读 localStorage 里的会话记录,按月渲染日历;有记录的日子可点开,
 * 下方展示那天的情绪与推荐。可翻月、跳到当月回顾。
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getServerSessionsSnapshot,
  getSessionsSnapshot,
  localDateKey,
  subscribeSessions,
  type MoodSessionRecord,
} from "@/lib/history";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/* ---------- 单条会话详情 ---------- */
function SessionDetail({ session }: { session: MoodSessionRecord }) {
  const time = new Date(session.savedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const moodBits = [
    ...session.moodTags,
    session.colorEmoji,
    session.weatherEmoji,
  ].filter(Boolean);

  return (
    <div className="border-t border-dashed border-mt-stroke pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-eyebrow text-mt-muted">{time}</p>
        {moodBits.length > 0 && (
          <p className="text-[12px] text-mt-muted">{moodBits.join(" · ")}</p>
        )}
      </div>
      {session.moodText && (
        <p className="mt-2 text-[14px] italic text-mt-fg">
          “{session.moodText}”
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {session.recommendations.map((rec, i) => (
          <div
            key={`${rec.title}-${i}`}
            className="rounded-xl border border-mt-stroke p-4"
          >
            <p className="truncate text-[14px] font-bold uppercase tracking-[-0.01em] text-mt-fg">
              {rec.title}
            </p>
            <p className="text-artist mt-1 truncate text-[11px] text-mt-muted">
              {rec.artist}
            </p>
            <p className="mt-2 text-[12px] italic leading-snug text-mt-muted">
              {rec.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0–11
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sessions = useSyncExternalStore(
    subscribeSessions,
    getSessionsSnapshot,
    getServerSessionsSnapshot,
  );

  // 会话按本地日期分组
  const byDate = useMemo(() => {
    const map = new Map<string, MoodSessionRecord[]>();
    for (const s of sessions) {
      const key = localDateKey(s.savedAt);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [sessions]);

  const monthKey = `${viewYear}-${pad2(viewMonth + 1)}`;
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  // 周一为首列的偏移
  const leadOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(null);
  }

  const selectedSessions = selectedDate ? (byDate.get(selectedDate) ?? []) : [];
  const monthHasRecords = Array.from(byDate.keys()).some((k) =>
    k.startsWith(monthKey),
  );

  return (
    <section className="py-8">
      <p className="text-eyebrow text-mt-muted">Listening history</p>
      <h1 className="text-display mt-4 text-[44px] text-mt-fg md:text-[64px]">
        Your moods,
        <br />
        on a calendar
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-mt-muted">
        Every mood you logged, pressed onto a calendar. Tap a day to revisit
        the record it spun.
      </p>

      <div className="mt-12 max-w-[760px]">
        {/* 月份导航 */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex size-9 items-center justify-center rounded-full border border-mt-stroke text-mt-muted transition-colors hover:border-mt-strong hover:text-mt-fg"
          >
            <ChevronLeft className="size-4" strokeWidth={1.7} />
          </button>
          <div className="flex items-baseline gap-3">
            <p className="text-display text-[22px] text-mt-fg">{monthLabel}</p>
            <Link
              href={`/recap/${monthKey}`}
              className="text-eyebrow text-mt-muted underline-offset-4 hover:text-mt-fg hover:underline"
            >
              Recap
            </Link>
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex size-9 items-center justify-center rounded-full border border-mt-stroke text-mt-muted transition-colors hover:border-mt-strong hover:text-mt-fg"
          >
            <ChevronRight className="size-4" strokeWidth={1.7} />
          </button>
        </div>

        {/* 日历 */}
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[10px] uppercase tracking-[0.15em] text-mt-faint"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: leadOffset }, (_, i) => (
            <div key={`lead-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateKey = `${monthKey}-${pad2(day)}`;
            const has = byDate.has(dateKey);
            const cover = has
              ? (byDate.get(dateKey)?.[0]?.coverArt ?? null)
              : null;
            const selected = selectedDate === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                disabled={!has}
                onClick={() => setSelectedDate(dateKey)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-md border transition-colors",
                  has
                    ? "border-mt-stroke hover:border-mt-strong"
                    : "cursor-default border-mt-stroke/40",
                  selected && "border-mt-strong",
                )}
              >
                {cover ? (
                  <>
                    {/* 头号推荐曲的专辑封面 */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url(${cover})` }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/55 to-transparent"
                    />
                    <span className="absolute left-1.5 top-1 text-[11px] font-medium tabular-nums text-white">
                      {day}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        "absolute left-1.5 top-1 text-[11px] tabular-nums",
                        has ? "text-mt-fg" : "text-mt-faint",
                      )}
                    >
                      {day}
                    </span>
                    {has && (
                      <span className="absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-mt-fg" />
                    )}
                  </>
                )}
                {selected && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-mt-strong"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 选中日的详情 */}
        {selectedSessions.length > 0 && (
          <div className="mt-10 space-y-8">
            {selectedSessions.map((s) => (
              <SessionDetail key={s.id} session={s} />
            ))}
          </div>
        )}

        {/* 空态 */}
        {!monthHasRecords && (
          <p className="mt-10 text-[13px] text-mt-muted">
            No moods logged this month.{" "}
            <Link
              href="/mood-input"
              className="underline underline-offset-4 hover:text-mt-fg"
            >
              Set one now
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
