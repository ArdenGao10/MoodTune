/*
 * POST /api/auth/spotify/logout —— 退出登录。
 * 清空 access / refresh cookie，下一次 mode 即回落到 Demo。
 */

import { NextResponse } from "next/server";
import { SP_COOKIE } from "@/lib/spotify/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SP_COOKIE.access);
  res.cookies.delete(SP_COOKIE.refresh);
  return res;
}
