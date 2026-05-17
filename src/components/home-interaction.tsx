"use client";

/*
 * <HomeInteraction /> —— 首页"点击任意位置开始"的交互层。
 *  - 整个区域可点击：点击后发出手绘 ripple，短暂延迟后跳转。
 *  - 精确指针设备：渲染一个跟随光标的圆圈（mix-blend difference，深浅主题都可见）。
 *  - 触摸设备：无跟随圆圈，仅保留点击 ripple。
 *  - 键盘可达：role=button + Enter/Space 触发。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import rough from "roughjs";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// 订阅"精确指针"媒体查询：触摸设备返回 false（不渲染跟随圆圈）
function useFinePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );
}

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

// 单个手绘 ripple —— 两圈粗糙同心圆，由 CSS 关键帧扩散淡出
function Ripple({ x, y }: { x: number; y: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const fg = cssVar("--fg");
    svg.appendChild(
      rc.circle(70, 70, 84, {
        stroke: fg,
        strokeWidth: 1.4,
        roughness: 1.7,
        bowing: 1.4,
      }),
    );
    svg.appendChild(
      rc.circle(70, 70, 52, {
        stroke: fg,
        strokeWidth: 1,
        roughness: 2,
        bowing: 1.8,
      }),
    );
  }, []);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed z-[55]"
      style={{
        left: x,
        top: y,
        width: 140,
        height: 140,
        marginLeft: -70,
        marginTop: -70,
        animation: "mt-ripple 0.6s ease-out forwards",
      }}
    >
      <svg ref={svgRef} viewBox="0 0 140 140" width={140} height={140} />
    </span>
  );
}

export interface HomeInteractionProps {
  children: ReactNode;
  onActivate: () => void;
}

export function HomeInteraction({
  children,
  onActivate,
}: HomeInteractionProps) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleId = useRef(0);
  const activated = useRef(false);
  const finePointer = useFinePointer();

  const navigate = useCallback(() => {
    if (activated.current) return;
    activated.current = true;
    // 留一点时间让 ripple 可见再跳转
    window.setTimeout(onActivate, 320);
  }, [onActivate]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const id = rippleId.current++;
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
      navigate();
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate();
      }
    },
    [navigate],
  );

  const cursorSize = hovering ? 30 : 24;

  return (
    <section
      role="button"
      tabIndex={0}
      aria-label="Begin — go to mood input"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={
        finePointer
          ? (e) => setPointer({ x: e.clientX, y: e.clientY })
          : undefined
      }
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setPointer(null);
      }}
      className="relative outline-none"
    >
      {children}

      {/* 跟随光标的圆圈 —— 仅精确指针设备 */}
      {finePointer && pointer && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[55] rounded-full"
          style={{
            left: pointer.x,
            top: pointer.y,
            width: cursorSize,
            height: cursorSize,
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            mixBlendMode: "difference",
            transition:
              "left 0.12s ease-out, top 0.12s ease-out, width 0.18s ease, height 0.18s ease",
          }}
        />
      )}

      {ripples.map((r) => (
        <Ripple key={r.id} x={r.x} y={r.y} />
      ))}
    </section>
  );
}
