import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Next 16 logs Server Function arguments by default in development.
  // Passwords and one-time tokens must never appear in local request traces.
  logging: { serverFunctions: false, incomingRequests: false, browserToTerminal: false },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }] }];
  },
};

export default nextConfig;
