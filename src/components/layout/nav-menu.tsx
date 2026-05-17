"use client";

/*
 * <NavMenu /> —— 顶栏右侧「⋯」菜单：用于在五个路由之间切换。
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "../ui/IconButton";

// 当前月份，用于 /recap 链接
const recapMonth = new Date().toISOString().slice(0, 7);

const LINKS = [
  { href: "/", base: "/", label: "Home" },
  { href: "/recommendations", base: "/recommendations", label: "Discover" },
  { href: "/history", base: "/history", label: "History" },
  { href: `/recap/${recapMonth}`, base: "/recap", label: "Recap" },
  { href: "/login", base: "/login", label: "Login" },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton
        ariaLabel="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        icon={<MoreHorizontal className="size-4" strokeWidth={1.6} />}
      />

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-44 overflow-hidden rounded-xl border border-mt-stroke bg-mt-bg p-1.5 shadow-2xl"
        >
          {LINKS.map((link) => {
            const active =
              link.base === "/"
                ? pathname === "/"
                : pathname.startsWith(link.base);
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-eyebrow transition-colors",
                  active
                    ? "bg-mt-fg text-mt-bg"
                    : "text-mt-muted hover:bg-mt-stroke/25 hover:text-mt-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
