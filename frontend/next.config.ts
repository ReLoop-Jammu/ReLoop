import type { NextConfig } from "next";

// Baseline security headers. The CSP below holds only the directives that
// cannot break Next.js's own scripts; a full script-src policy (with nonces) is
// added in Phase 7, once third-party origins (Supabase, analytics) are known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Add "; preload" only once the production domain is ready to be submitted to
  // the browser preload list: removing a domain from that list is slow.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Old marketplace URLs (before the business-plan redesign) now point to the shop.
  async redirects() {
    return [
      { source: "/listings", destination: "/shop", permanent: true },
      { source: "/listings/:slug", destination: "/shop", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
