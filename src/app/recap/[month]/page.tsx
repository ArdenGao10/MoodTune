/*
 * /recap/[month] —— 月度回顾。阶段 0 为占位骨架。
 * month 形如 "2026-05"。
 */

const STATS = [
  { label: "Tracks played", value: "—" },
  { label: "Top mood", value: "—" },
  { label: "Minutes listened", value: "—" },
  { label: "New discoveries", value: "—" },
];

export default async function RecapPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const decoded = decodeURIComponent(month);

  // 把 "YYYY-MM" 格式化为 "May 2026"
  let label = decoded;
  const match = /^(\d{4})-(\d{1,2})$/.exec(decoded);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    label = date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  return (
    <section className="py-8">
      <p className="text-eyebrow text-mt-muted">Monthly recap</p>
      <h1 className="text-display mt-4 text-[44px] text-mt-fg md:text-[72px]">
        {label}
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-mt-muted">
        A month of moods, mixed down into one side of a record.
      </p>

      <div className="mt-12 grid max-w-[760px] grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-mt-stroke p-5"
          >
            <p className="text-display text-[40px] text-mt-fg">
              {stat.value}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-mt-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
