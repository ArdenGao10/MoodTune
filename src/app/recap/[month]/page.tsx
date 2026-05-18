"use client";

/*
 * /recap/[month] —— 月度回顾。month 形如 "2026-05"。
 * 读 localStorage 里该月的会话,汇总成几个数字 + 当月歌单。
 */

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getServerSessionsSnapshot,
  getSessionsSnapshot,
  localMonthKey,
  subscribeSessions,
} from "@/lib/history";

/** "YYYY-MM" → "May 2026";解析失败则原样返回 */
function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{1,2})$/.exec(month);
  if (!m) return month;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function RecapPage() {
  const params = useParams<{ month: string }>();
  const month = decodeURIComponent(
    Array.isArray(params.month) ? params.month[0] : (params.month ?? ""),
  );

  const allSessions = useSyncExternalStore(
    subscribeSessions,
    getSessionsSnapshot,
    getServerSessionsSnapshot,
  );
  const sessions = useMemo(
    () => allSessions.filter((s) => localMonthKey(s.savedAt) === month),
    [allSessions, month],
  );

  const { stats, songs } = useMemo(() => {
    const allRecs = sessions.flatMap((s) => s.recommendations);
    const artists = new Set(allRecs.map((r) => r.artist.toLowerCase()));

    // 出现最多的情绪标签
    const moodCount = new Map<string, number>();
    for (const s of sessions) {
      for (const tag of s.moodTags) {
        moodCount.set(tag, (moodCount.get(tag) ?? 0) + 1);
      }
    }
    let topMood = "—";
    let topN = 0;
    for (const [tag, n] of moodCount) {
      if (n > topN) {
        topN = n;
        topMood = tag;
      }
    }

    return {
      stats: [
        { label: "Mood sessions", value: String(sessions.length) },
        { label: "Songs", value: String(allRecs.length) },
        { label: "Top mood", value: topMood },
        { label: "Artists", value: String(artists.size) },
      ],
      songs: allRecs,
    };
  }, [sessions]);

  const empty = sessions.length === 0;

  return (
    <section className="py-8">
      <p className="text-eyebrow text-mt-muted">Monthly recap</p>
      <h1 className="text-display mt-4 text-[44px] text-mt-fg md:text-[72px]">
        {monthLabel(month)}
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-mt-muted">
        A month of moods, mixed down into one side of a record.
      </p>

      {empty ? (
        <p className="mt-12 text-[13px] text-mt-muted">
          Nothing logged this month yet.{" "}
          <Link
            href="/mood-input"
            className="underline underline-offset-4 hover:text-mt-fg"
          >
            Set a mood
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-12 grid max-w-[760px] grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-mt-stroke p-5"
              >
                <p className="text-display truncate text-[34px] text-mt-fg">
                  {stat.value}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-mt-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {songs.length > 0 && (
            <div className="mt-12 max-w-[760px]">
              <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-mt-muted">
                Everything you span this month
              </p>
              <ul className="divide-y divide-dashed divide-mt-stroke">
                {songs.map((rec, i) => (
                  <li
                    key={`${rec.title}-${i}`}
                    className="flex items-baseline gap-4 py-3"
                  >
                    <span className="text-display shrink-0 text-[16px] text-mt-faint tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold uppercase tracking-[-0.01em] text-mt-fg">
                        {rec.title}
                      </span>
                      <span className="text-artist block truncate text-[11px] text-mt-muted">
                        {rec.artist}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Link
        href="/history"
        className="text-eyebrow mt-12 inline-block text-mt-muted underline-offset-4 hover:text-mt-fg hover:underline"
      >
        Back to history
      </Link>
    </section>
  );
}
