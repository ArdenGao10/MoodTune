/*
 * GET /api/auth/spotify/callback —— Spotify OAuth 回调。
 * 校验 state（CSRF）、用 code + PKCE verifier 换 token，
 * 把 access / refresh 写入 httpOnly cookie，再跳回首页。
 *
 * 跳回首页时带 ?spotify=connected|denied|error，失败时再带 &reason=...
 * 把具体失败原因直接编进 URL，方便定位（详细错误另见 dev server 终端）。
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
  const reqUrl = new URL(req.url);
  const { searchParams } = reqUrl;
  // 用 Host 头构造跳转目标 —— req.url 的 host 在 dev 下不可靠
  const host = req.headers.get("host") ?? reqUrl.host;
  const origin = `${reqUrl.protocol}//${host}`;

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  /** 跳回首页；失败时清掉 PKCE 临时 cookie 并带上 reason */
  function redirectHome(status: string, reason?: string): NextResponse {
    const url = new URL("/", origin);
    url.searchParams.set("spotify", status);
    if (reason) url.searchParams.set("reason", reason);
    const res = NextResponse.redirect(url);
    if (status !== "connected") {
      res.cookies.delete(SP_COOKIE.verifier);
      res.cookies.delete(SP_COOKIE.state);
    }
    return res;
  }

  const store = await cookies();
  const verifier = store.get(SP_COOKIE.verifier)?.value;
  const savedState = store.get(SP_COOKIE.state)?.value;

  console.log(
    `spotify callback: host=${host} hasCode=${Boolean(code)} ` +
      `hasVerifier=${Boolean(verifier)} hasState=${Boolean(savedState)}`,
  );

  if (oauthError) {
    console.warn("spotify callback: authorization denied —", oauthError);
    return redirectHome("denied");
  }
  if (!code || !returnedState) {
    console.error("spotify callback: missing code/state in query");
    return redirectHome("error", "missing_params");
  }
  if (!verifier || !savedState) {
    // 登录与回调跑在了不同 host（localhost vs 127.0.0.1），PKCE cookie 跨域丢失
    console.error(
      "spotify callback: PKCE cookies missing — login and callback ran on " +
        "different hosts; use 127.0.0.1 consistently",
    );
    return redirectHome("error", "no_cookies");
  }
  if (returnedState !== savedState) {
    console.error("spotify callback: state mismatch (possible CSRF)");
    return redirectHome("error", "state_mismatch");
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    const res = redirectHome("connected");
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
    // error.message 即 Spotify 的错误码（见 auth.ts requestToken）
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("spotify callback: token exchange failed —", detail);
    return redirectHome("error", `token_${detail}`);
  }
}
