import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许 dev server 从 127.0.0.1 / localhost 两种 host 访问其资源，
  // 避免跨 origin 时 _next 资源被拦、页面无法 hydrate。
  // Spotify 回调用的是 127.0.0.1，dev 也绑定到 127.0.0.1（见 package.json）。
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
