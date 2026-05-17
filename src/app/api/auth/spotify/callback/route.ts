/*
 * GET /api/auth/spotify/callback —— Spotify OAuth 回调。
 * 校验 state（CSRF）、用 code + PKCE verifier 换 token，
 * 把 access / refresh 写入 httpOnly cookie，再跳回首页。
 *
 * 跳回首页时带 ?spotify=connected|denied|error 查询参数，方便临时测试
 * 按钮显示结果（下一阶段的 UI 会正式处理这些状态）。
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieOptions,
  exchangeCodeForToken,
  refreshCookieOptions,
  SP_COOKIE,
} from "@/lib/spotify/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  function homeWith(status: string): URL {
    const url = new URL("/", origin);
    url.searchParams.set("spotify", status);
    return url;
  }

  /** 失败时：跳回首页并清掉 PKCE 临时 cookie */
  function fail(status: string): NextResponse {
    const res = NextResponse.redirect(homeWith(status));
    res.cookies.delete(SP_COOKIE.verifier);
    res.cookies.delete(SP_COOKIE.state);
    return res;
  }

  const store = await cookies();
  const verifier = store.get(SP_COOKIE.verifier)?.value;
  const savedState = store.get(SP_COOKIE.state)?.value;

  if (oauthError) {
    console.warn("spotify callback: authorization denied —", oauthError);
    return fail("denied");
  }
  if (!code || !returnedState) {
    console.error("spotify callback: missing code or state in query");
    return fail("error");
  }
  if (!verifier || !savedState) {
    // 最常见原因：登录与回调的 host 不一致（localhost vs 127.0.0.1），
    // 导致 PKCE 临时 cookie 跨域读不到。
    console.error(
      "spotify callback: PKCE cookies missing — likely a host mismatch " +
        "between login and callback (use 127.0.0.1 consistently). " +
        `verifier=${Boolean(verifier)} state=${Boolean(savedState)}`,
    );
    return fail("error");
  }
  if (returnedState !== savedState) {
    console.error("spotify callback: state mismatch (possible CSRF)");
    return fail("error");
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    const res = NextResponse.redirect(homeWith("connected"));
    res.cookies.set(
      SP_COOKIE.access,
      token.access_token,
      accessCookieOptions(token.expires_in),
    );
    if (token.refresh_token) {
      res.cookies.set(
        SP_COOKIE.refresh,
        token.refresh_token,
        refreshCookieOptions(),
      );
    }
    // 用完即弃 PKCE 临时 cookie
    res.cookies.delete(SP_COOKIE.verifier);
    res.cookies.delete(SP_COOKIE.state);
    return res;
  } catch (error) {
    console.error("spotify: token exchange failed", error);
    return fail("error");
  }
}
