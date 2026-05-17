"use client";

/*
 * / —— Home：封面页。
 * 桌面：左上文案 + 右下角"四分之三压角"的大唱片 → 对角线构图。
 * 移动：文案在上，完整正圆唱片在下方居中（不裁切）。
 * 点击页面任意位置跳转 /mood-input。品牌名 MOODTUNE 见顶栏。
 */

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Vinyl } from "@/components/vinyl";
import { HomeInteraction } from "@/components/home-interaction";

export default function HomePage() {
  const router = useRouter();

  const handleBegin = () => router.push("/mood-input");

  // 文案分批淡入：slogan → 描述 → 提示
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: "easeOut" as const },
  });

  return (
    <HomeInteraction onActivate={handleBegin}>
      {/* ============ 桌面端 ≥1024px：右下角压角的大唱片 ============ */}
      {/* 圆心钉在视口右下角外侧（translate 35%/40%）→ 露出左上约 3/4 圆，右/下被视口切掉。
          z-[1] 低于顶栏状态区(z-10) → 不遮挡右上角状态信息。 */}
      <div className="fixed bottom-0 right-0 z-[1] hidden h-[min(110vh,110vw)] w-[min(110vh,110vw)] translate-x-[35%] translate-y-[40%] lg:block">
        <motion.div
          initial={{ x: "24%", y: "24%", opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full w-full"
        >
          <Vinyl isPlaying className="h-full w-full" />
        </motion.div>
      </div>

      {/* ============ 桌面端 ≥1024px：左上文案 ============ */}
      <div className="relative z-10 hidden min-h-[calc(100vh-180px)] max-w-[60vw] flex-col justify-start pt-[3vh] lg:flex">
        <motion.h1
          {...fadeUp(0)}
          className="font-black tracking-[-0.02em] text-mt-fg"
          style={{ fontSize: "clamp(48px, 6.6vw, 116px)", lineHeight: 0.92 }}
        >
          Tonight,
          <br />
          what does
          <br />
          your mood
          <br />
          sound{" "}
          <span className="italic" style={{ color: "var(--accent)" }}>
            like?
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.15)}
          className="mt-9 max-w-[460px] text-[17px] leading-[1.6] text-mt-muted"
        >
          An AI DJ that picks songs for your every weather, every feeling,
          every late night. — Curated for those who outgrew Top 50.
        </motion.p>

        <motion.p
          {...fadeUp(0.3)}
          className="mt-6 font-hand text-[16px] text-mt-muted"
        >
          click anywhere to begin
        </motion.p>
      </div>

      {/* ============ < 1024px：纵向堆叠，唱片在下、完整正圆 ============ */}
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-9 lg:hidden">
        {/* 文案 */}
        <div className="flex flex-col items-center px-2 text-center">
          <motion.h1
            {...fadeUp(0)}
            className="font-black tracking-[-0.02em] text-mt-fg"
            style={{ fontSize: "clamp(38px, 9vw, 52px)", lineHeight: 0.95 }}
          >
            What does
            <br />
            your mood
            <br />
            sound{" "}
            <span className="italic" style={{ color: "var(--accent)" }}>
              like?
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.15)}
            className="mt-5 max-w-[330px] text-[14px] leading-[1.55] text-mt-muted"
          >
            An AI DJ for your every weather, every feeling, every late night.
          </motion.p>

          <motion.p
            {...fadeUp(0.3)}
            className="mt-5 font-hand text-[15px] text-mt-muted"
          >
            tap anywhere
          </motion.p>
        </div>

        {/* 唱片：完整正圆，aspect-square 由 Vinyl 自身保证，不裁切 */}
        <motion.div
          initial={{ y: 36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ width: "min(86vw, 420px)" }}
        >
          <Vinyl isPlaying />
        </motion.div>
      </div>
    </HomeInteraction>
  );
}
