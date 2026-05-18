"use client";

/*
 * <Vinyl /> —— MoodTune 的核心视觉：手绘风格的黑胶唱片。
 *
 * 图层结构（由外到内）：
 *  wobble 层  —— 4s 一周期的轻微上下抖动
 *   ├─ rotor 层    —— 12s/圈旋转：唱片纹理 SVG + 中心专辑封面
 *   ├─ doodles 层  —— 25s/圈反向旋转：外圈手绘装饰（音符 / 星 / 波浪…）
 *   └─ center hole —— 静止的中心轴孔
 *
 * 细节：
 *  - 唱片纹理与装饰用 roughjs 绘制，颜色取自主题 CSS 变量，切换主题时重绘。
 *  - 专辑封面套用 SVG 液态滤镜（feTurbulence + feDisplacementMap），
 *    参数由 requestAnimationFrame 持续驱动，产生缓慢流动。
 *  - isPlaying 为 false 时旋转就地暂停。
 */

import { useEffect, useId, useRef } from "react";
import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { BrandCover } from "./BrandCover";

export interface VinylProps {
  /** 直径（px）。省略时填满父容器宽度。 */
  size?: number;
  /** 是否播放：true 时旋转，false 时就地暂停。 */
  isPlaying?: boolean;
  /** 中心专辑封面图 URL；缺省时用 <BrandCover /> 作为站点默认封面。 */
  albumArtUrl?: string;
  /** 旋转一圈的秒数，默认 12s；加载态可调快。 */
  spinSeconds?: number;
  className?: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const VB = 380; // viewBox 尺寸
const C = VB / 2; // 圆心 190

type DoodleType =
  | "star"
  | "triangle"
  | "note"
  | "circle"
  | "wave"
  | "text-432"
  | "plus"
  | "arrow";

const DOODLES: { angle: number; type: DoodleType }[] = [
  { angle: -90, type: "star" },
  { angle: -45, type: "triangle" },
  { angle: 0, type: "note" },
  { angle: 45, type: "circle" },
  { angle: 90, type: "wave" },
  { angle: 135, type: "text-432" },
  { angle: 180, type: "plus" },
  { angle: 225, type: "arrow" },
];

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// 绘制单个外圈手绘装饰
function drawDoodle(
  rc: RoughSVG,
  svg: SVGSVGElement,
  x: number,
  y: number,
  type: DoodleType,
  color: string,
  faint: string,
) {
  switch (type) {
    case "star": {
      const s = 5;
      svg.appendChild(rc.line(x, y - s, x, y + s, { stroke: color, strokeWidth: 1.2, roughness: 1 }));
      svg.appendChild(rc.line(x - s, y, x + s, y, { stroke: color, strokeWidth: 1.2, roughness: 1 }));
      svg.appendChild(rc.line(x - s * 0.6, y - s * 0.6, x + s * 0.6, y + s * 0.6, { stroke: color, strokeWidth: 0.7, roughness: 1 }));
      svg.appendChild(rc.line(x - s * 0.6, y + s * 0.6, x + s * 0.6, y - s * 0.6, { stroke: color, strokeWidth: 0.7, roughness: 1 }));
      break;
    }
    case "triangle": {
      const s = 8;
      svg.appendChild(
        rc.polygon(
          [
            [x, y - s],
            [x - s * 0.866, y + s * 0.5],
            [x + s * 0.866, y + s * 0.5],
          ],
          { stroke: color, strokeWidth: 1.2, roughness: 1.2 },
        ),
      );
      break;
    }
    case "note": {
      svg.appendChild(rc.ellipse(x, y + 3, 8, 5, { stroke: color, strokeWidth: 1, fill: color, fillStyle: "solid", roughness: 0.8 }));
      svg.appendChild(rc.line(x + 4, y + 3, x + 4, y - 12, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      break;
    }
    case "circle": {
      svg.appendChild(rc.circle(x, y, 10, { stroke: faint, strokeWidth: 1, roughness: 1 }));
      break;
    }
    case "wave": {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        pts.push([x - 20 + i * 5, y + Math.sin((i / 8) * Math.PI * 2) * 3]);
      }
      svg.appendChild(rc.curve(pts, { stroke: color, strokeWidth: 1, roughness: 0.8 }));
      break;
    }
    case "plus": {
      const s = 5;
      svg.appendChild(rc.line(x, y - s, x, y + s, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      svg.appendChild(rc.line(x - s, y, x + s, y, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      break;
    }
    case "arrow": {
      svg.appendChild(rc.line(x - 8, y - 4, x + 8, y + 4, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      svg.appendChild(rc.line(x + 8, y + 4, x + 3, y + 5, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      svg.appendChild(rc.line(x + 8, y + 4, x + 6, y - 1, { stroke: color, strokeWidth: 1.2, roughness: 0.8 }));
      break;
    }
    case "text-432": {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", `${x - 14}`);
      t.setAttribute("y", `${y + 4}`);
      t.setAttribute("fill", faint);
      t.setAttribute("font-size", "13");
      t.style.fontFamily = "var(--font-caveat), cursive";
      t.textContent = "432hz";
      svg.appendChild(t);
      break;
    }
  }
}

export function Vinyl({
  size,
  isPlaying = false,
  albumArtUrl,
  spinSeconds = 12,
  className,
}: VinylProps) {
  const vinylRef = useRef<SVGSVGElement>(null);
  const doodlesRef = useRef<SVGSVGElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const { theme } = useTheme();

  const uid = useId().replace(/:/g, "");
  const liquidId = `vinyl-liquid-${uid}`;

  // 绘制唱片纹理与外圈装饰 —— 主题切换时重绘
  useEffect(() => {
    const vinylSvg = vinylRef.current;
    const doodlesSvg = doodlesRef.current;
    if (!vinylSvg || !doodlesSvg) return;

    vinylSvg.replaceChildren();
    doodlesSvg.replaceChildren();

    const vinylBase = cssVar("--vinyl-base");
    const groove = cssVar("--vinyl-groove");
    const grooveFaint = cssVar("--vinyl-groove-faint");
    const innerEdge = cssVar("--vinyl-inner-edge");
    const doodle = cssVar("--doodle");
    const doodleFaint = cssVar("--doodle-faint");

    // ---- 唱片本体 ----
    const rc = rough.svg(vinylSvg);

    const outerFill = document.createElementNS(SVG_NS, "circle");
    outerFill.setAttribute("cx", `${C}`);
    outerFill.setAttribute("cy", `${C}`);
    outerFill.setAttribute("r", "180");
    outerFill.setAttribute("fill", vinylBase);
    vinylSvg.appendChild(outerFill);

    // 同心 grooves —— 微微粗糙、几乎规整
    const grooveRadii = [355, 340, 320, 300, 278, 256, 234, 212, 190];
    for (const d of grooveRadii) {
      vinylSvg.appendChild(
        rc.circle(C, C, d, { stroke: groove, strokeWidth: 0.5, roughness: 0.6, bowing: 0.3 }),
      );
    }
    // 细微纹理环
    for (let i = 0; i < 6; i++) {
      vinylSvg.appendChild(
        rc.circle(C, C, 200 + Math.random() * 150, {
          stroke: grooveFaint,
          strokeWidth: 0.3,
          roughness: 0.8,
          bowing: 0.5,
        }),
      );
    }
    // 中心标签边界环
    vinylSvg.appendChild(
      rc.circle(C, C, 168, { stroke: innerEdge, strokeWidth: 1, roughness: 1, bowing: 0.5 }),
    );

    // ---- 外圈装饰 ----
    const rcd = rough.svg(doodlesSvg);
    for (const { angle, type } of DOODLES) {
      const rad = (angle * Math.PI) / 180;
      const r = 165;
      drawDoodle(
        rcd,
        doodlesSvg,
        C + Math.cos(rad) * r,
        C + Math.sin(rad) * r,
        type,
        doodle,
        doodleFaint,
      );
    }
    // 装饰之间的散点
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = 165;
      doodlesSvg.appendChild(
        rcd.circle(C + Math.cos(a) * r, C + Math.sin(a) * r, 3, {
          stroke: doodleFaint,
          strokeWidth: 0.8,
          fill: doodleFaint,
          fillStyle: "solid",
          roughness: 0.5,
        }),
      );
    }
  }, [theme]);

  // 液态滤镜动画 —— 持续驱动 turbulence / displacement 参数
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const fx = 0.015 + Math.sin(elapsed * 0.3) * 0.005;
      const fy = 0.025 + Math.cos(elapsed * 0.4) * 0.008;
      turbRef.current?.setAttribute("baseFrequency", `${fx} ${fy}`);
      dispRef.current?.setAttribute(
        "scale",
        `${28 + Math.sin(elapsed * 0.8) * 12}`,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playState = isPlaying ? "running" : "paused";

  // 中心封面内容 —— 有 albumArtUrl 用真实封面，否则用站点固定的 <BrandCover />。
  // 会被渲染两次（锐利底层 + 液态外环层）。
  const coverInner = albumArtUrl ? (
    <div
      className="h-full w-full"
      style={{
        backgroundImage: `url(${albumArtUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  ) : (
    <BrandCover />
  );

  return (
    <div
      className={cn("relative aspect-square select-none", className)}
      style={{ width: size ?? "100%" }}
    >
      {/* 液态滤镜定义（不可见） */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="absolute"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <filter id={liquidId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.015 0.025"
              numOctaves={2}
              seed={2}
              result="turb"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="turb"
              scale={28}
            />
          </filter>
        </defs>
      </svg>

      {/* wobble 层 */}
      <div
        className="absolute inset-0"
        style={{ animation: "mt-wobble 4s ease-in-out infinite" }}
      >
        {/* rotor 层：唱片纹理 + 封面，一同旋转 */}
        <div
          className="absolute inset-0"
          style={{
            animation: `mt-spin ${spinSeconds}s linear infinite`,
            animationPlayState: playState,
          }}
        >
          <svg
            ref={vinylRef}
            viewBox={`0 0 ${VB} ${VB}`}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Vinyl record"
          />
          {/* 中心封面：双层。底层锐利 —— 保证中心（人脸）不变形；
              顶层套液态滤镜，并用径向遮罩只保留外环 —— 于是只有边缘随滤镜流动。 */}
          <div
            className="absolute overflow-hidden rounded-full"
            style={{
              top: "50%",
              left: "50%",
              width: "52%",
              height: "52%",
              marginTop: "-26%",
              marginLeft: "-26%",
            }}
          >
            {/* 锐利底层 */}
            <div className="absolute inset-0">{coverInner}</div>
            {/* 液态外环层 —— 中心透明、外缘渐显 */}
            <div
              className="absolute inset-0"
              style={{
                filter: `url(#${liquidId})`,
                maskImage:
                  "radial-gradient(circle, transparent 40%, #000 70%)",
                WebkitMaskImage:
                  "radial-gradient(circle, transparent 40%, #000 70%)",
              }}
            >
              {coverInner}
            </div>
          </div>
        </div>

        {/* doodles 层：外圈装饰反向旋转 */}
        <div
          className="absolute inset-0"
          style={{
            animation: "mt-spin-reverse 25s linear infinite",
            animationPlayState: playState,
          }}
        >
          <svg
            ref={doodlesRef}
            viewBox={`0 0 ${VB} ${VB}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          />
        </div>

        {/* 静止的中心轴孔 */}
        <div
          className="absolute rounded-full"
          style={{
            top: "50%",
            left: "50%",
            width: "2.4%",
            height: "2.4%",
            transform: "translate(-50%, -50%)",
            background: "var(--hole)",
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
}
