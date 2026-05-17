"use client";

/*
 * / —— Home：封面页。
 * 桌面：左侧文案 + 右侧完整左半圆唱片（圆心钉在视口右缘，垂直居中，上下不裁切）。
 * 移动：文案在上，唱片在下，aspect-square 强制正圆、底部略切。
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
      {/* ============ 桌面端 ≥1024px：大半张露出的唱片 ============ */}
      {/* 圆心在视口内、仅右侧约 30% 滑出屏幕 → 露出大半张完整圆盘（含圆润的右下弧）；
          直径 ≤92vh 且垂直居中 → 上下不裁切，唯一的"切面"是视口右缘 */}
      <div className="fixed right-0 top-1/2 z-0 hidden h-[min(92vh,52vw)] w-[min(92vh,52vw)] -translate-y-1/2 translate-x-[30%] lg:block">
        <motion.div
          initial={{ x: "70%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full w-full"
        >
          <Vinyl isPlaying className="h-full w-full" />
        </motion.div>
      </div>

      {/* ============ 桌面端 ≥1024px：左侧文案 ============ */}
      <div className="relative z-10 hidden min-h-[calc(100vh-180px)] max-w-[min(580px,46vw)] flex-col justify-center lg:flex">
        <motion.h1
          {...fadeUp(0)}
          className="font-black tracking-[-0.02em] text-mt-fg"
          style={{ fontSize: "clamp(40px, 5.4vw, 88px)", lineHeight: 0.92 }}
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
          className="mt-9 text-[17px] leading-[1.6] text-mt-muted"
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

      {/* ============ < 1024px：纵向堆叠，唱片在下、保持正圆 ============ */}
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

        {/* 唱片：aspect-square 容器强制正圆，外框略矮 → 底部稍切 */}
        <div
          className="relative overflow-hidden"
          style={{ width: "min(86vw, 420px)", height: "min(63vw, 308px)" }}
        >
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full"
          >
            <Vinyl isPlaying />
          </motion.div>
        </div>
      </div>
    </HomeInteraction>
  );
}
