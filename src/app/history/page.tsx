/*
 * /history —— 历史日历视图。阶段 0 为占位骨架。
 */

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// 占位：标记若干「有收听记录」的日子
const ACTIVE_DAYS = new Set([2, 3, 7, 10, 11, 15, 18, 22, 23, 24, 29, 31]);

export default function HistoryPage() {
  const cells = Array.from({ length: 35 }, (_, i) => i);

  return (
    <section className="py-8">
      <p className="text-eyebrow text-mt-muted">Listening history</p>
      <h1 className="text-display mt-4 text-[44px] text-mt-fg md:text-[64px]">
        Your year
        <br />
        in sound
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-mt-muted">
        Every mood you logged, pressed onto a calendar. Tap a day to revisit
        the record it spun.
      </p>

      <div className="mt-12 max-w-[760px]">
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[10px] uppercase tracking-[0.15em] text-mt-faint"
            >
              {day}
            </div>
          ))}
          {cells.map((i) => {
            const active = ACTIVE_DAYS.has(i);
            return (
              <div
                key={i}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border transition-colors",
                  active
                    ? "border-mt-stroke hover:border-mt-strong"
                    : "border-mt-stroke/40",
                )}
              >
                {active && (
                  <span className="size-2.5 rounded-full bg-mt-fg" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
