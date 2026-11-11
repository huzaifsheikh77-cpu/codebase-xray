import type { NextConfig } from "next";

/**
 * Conservative security headers. The CSP deliberately sets only directives
 * that cannot break the App Router (frame-ancestors/base-uri/form-action);
 * a strict script-src policy would require per-request nonces.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  /**
   * The TypeScript compiler API is used at runtime by the analysis route to
   * build real syntax trees. It is a large CJS package; keeping it external
   * avoids bundling it into every server chunk while still resolving from
   * node_modules at runtime (it is a production dependency for that reason).
   */
  serverExternalPackages: ["typescript"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
