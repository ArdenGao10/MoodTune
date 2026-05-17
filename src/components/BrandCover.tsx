"use client";

/*
 * <BrandCover /> —— MoodTune 站点的默认专辑封面（固定，不随 mood 或歌曲变化）。
 * 接 Spotify 后，被真实专辑封面替换。
 *
 * 构图：
 *  - 径向暖色渐变背底
 *  - 中下：手绘人物剪影（头 + 头戴耳机）
 *  - 左上：弯月  ｜ 右上：3 颗散落小星 ｜ 中右：手绘波浪
 *  - 底部弧形文字 "MOODTUNE · SIDE A"（沿不可见弧路径排列）
 *  - 液态滤镜由外层 Vinyl 施加（保留之前的 feTurbulence + feDisplacementMap），
 *    封面在唱片中转动时产生液态流动感。
 */

import { useEffect, useId, useRef } from "react";
import rough from "roughjs";

export interface BrandCoverProps {
  /** 直径（px）。省略时填满父容器（推荐用法）。 */
  size?: number;
}

export function BrandCover({ size }: BrandCoverProps) {
  const decorRef = useRef<SVGGElement>(null);
  const uid = useId().replace(/:/g, "");
  const gradId = `brand-grad-${uid}`;
  const arcId = `brand-arc-${uid}`;

  // 手绘装饰只画一次（封面是固定的）
  useEffect(() => {
    const g = decorRef.current;
    if (!g) return;
    g.replaceChildren();
    const svg = g.ownerSVGElement;
    if (!svg) return;
    const rc = rough.svg(svg);

    const brown = "rgba(58,26,12,0.8)"; // #3A1A0C @80%
    const moon = "rgba(255,255,255,0.7)";
    const star = "rgba(255,255,255,0.6)";
    const wave = "rgba(255,255,255,0.55)";

    // ---- 人物剪影：肩 + 头 + 头戴耳机 ----
    // 肩
    g.appendChild(
      rc.path("M 55 178 Q 100 138 145 178 Z", {
        fill: brown,
        fillStyle: "solid",
        stroke: brown,
        strokeWidth: 1,
        roughness: 1.1,
        seed: 7,
      }),
    );
    // 头
    g.appendChild(
      rc.circle(100, 120, 50, {
        fill: brown,
        fillStyle: "solid",
        stroke: brown,
        strokeWidth: 1,
        roughness: 1,
        seed: 8,
      }),
    );
    // 耳机头梁（头顶弧）
    g.appendChild(
      rc.arc(100, 120, 66, 66, Math.PI, Math.PI * 2, false, {
        stroke: brown,
        strokeWidth: 3,
        roughness: 1.1,
        seed: 9,
      }),
    );
    // 两侧耳罩
    g.appendChild(
      rc.circle(70, 122, 16, {
        fill: brown,
        fillStyle: "solid",
        stroke: brown,
        strokeWidth: 1,
        roughness: 1,
        seed: 10,
      }),
    );
    g.appendChild(
      rc.circle(130, 122, 16, {
        fill: brown,
        fillStyle: "solid",
        stroke: brown,
        strokeWidth: 1,
        roughness: 1,
        seed: 11,
      }),
    );

    // ---- 左上弯月 ----
    g.appendChild(
      rc.path("M 52 36 A 17 17 0 1 0 52 70 A 13 15 0 1 1 52 36 Z", {
        fill: moon,
        fillStyle: "solid",
        stroke: moon,
        strokeWidth: 1,
        roughness: 1.1,
        seed: 12,
      }),
    );

    // ---- 右上 3 颗小星（sparkle 十字） ----
    const stars: [number, number, number][] = [
      [143, 42, 6],
      [164, 55, 4.5],
      [150, 72, 5],
    ];
    for (const [sx, sy, r] of stars) {
      g.appendChild(
        rc.line(sx - r, sy, sx + r, sy, {
          stroke: star,
          strokeWidth: 1.4,
          roughness: 1,
        }),
      );
      g.appendChild(
        rc.line(sx, sy - r, sx, sy + r, {
          stroke: star,
          strokeWidth: 1.4,
          roughness: 1,
        }),
      );
    }

    // ---- 中右波浪线 ----
    const wavePts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      wavePts.push([128 + i * 6, 100 + 5 * Math.sin((i / 8) * Math.PI * 2)]);
    }
    g.appendChild(
      rc.linearPath(wavePts, {
        stroke: wave,
        strokeWidth: 1.6,
        roughness: 1,
        bowing: 1,
      }),
    );
  }, []);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size ?? "100%"}
      height={size ?? "100%"}
      role="img"
      aria-label="MoodTune cover"
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#F2A572" />
          <stop offset="35%" stopColor="#D8703F" />
          <stop offset="70%" stopColor="#7A3520" />
          <stop offset="100%" stopColor="#2A1208" />
        </radialGradient>
        {/* 底部弧 —— 文字沿此路径排列 */}
        <path id={arcId} d="M 12 100 A 88 88 0 0 1 188 100" fill="none" />
      </defs>

      {/* 渐变背景 */}
      <circle cx="100" cy="100" r="100" fill={`url(#${gradId})`} />

      {/* 手绘装饰 */}
      <g ref={decorRef} />

      {/* 底部弧形文字 */}
      <text
        fontSize="11"
        fill="rgba(255,255,255,0.5)"
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 500,
          letterSpacing: "0.2em",
        }}
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          MOODTUNE · SIDE A
        </textPath>
      </text>
    </svg>
  );
}
