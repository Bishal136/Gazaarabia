import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * SECURITY-HARDENED NEXT.JS CONFIG
 * Compatible with Next.js 13 / 14 (App Router or Pages)
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "1024mb",
    },
  },

  // Do not expose source maps in production
  productionBrowserSourceMaps: false,

  // next/image remote-host allow-list. This is a multi-vendor marketplace: product
  // images are served from each seller's storefront CDN — Shopify products come from
  // cdn.shopify.com, WooCommerce/custom sellers from arbitrary hosts. We allow any
  // HTTPS host (consistent with the CSP `img-src … https:` above). To lock this down
  // to known platforms, replace the `**` entry with explicit `hostname` entries
  // (e.g. "cdn.shopify.com").
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  async redirects() {
    return [
      {
        source: "/blogs",
        destination: "/blogs/journal",
        permanent: true,
      },
      {
        source: "/blog",
        destination: "/blogs/journal",
        permanent: true,
      },
      {
        source: "/blog/:slug",
        destination: "/blogs/journal/:slug",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // --- Core browser protections ---
          {
            key: "X-Frame-Options",
            value: "DENY", // Prevent clickjacking
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Prevent MIME sniffing
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // --- Permissions / feature abuse control ---
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "camera=()",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "payment=*",
              "usb=()",
            ].join(", "),
          },

          // --- Cross-site isolation (safe default, allows popups for PayPal) ---
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },

          // --- XSS mitigation ---
          {
            key: "X-XSS-Protection",
            value: "0", // Disable legacy buggy filter (modern CSP is better)
          },

          // --- Content Security Policy ---
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",

              // Scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.paypal.com https://*.paypalobjects.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://*.stripe.com https://apple-pay-gateway.apple.com https://pay.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net",

              // Styles (unsafe-inline allowed for Next.js/React styles)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.hcaptcha.com",

              // Images
              "img-src 'self' data: blob: https: https://*.paypalobjects.com https://*.paypal.com https://*.stripe.com https://*.hcaptcha.com https://www.facebook.com https://*.google-analytics.com https://*.googletagmanager.com",

              // Fonts
              "font-src 'self' data: https://fonts.gstatic.com",

              // Frames
              "frame-src 'self' blob: data: https://*.youtube.com https://www.youtube.com https://player.vimeo.com https://*.paypal.com https://*.paypalobjects.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://*.stripe.com https://apple-pay-gateway.apple.com https://pay.google.com https://www.googletagmanager.com",

              // API / backend calls
              "connect-src 'self' https: http: blob: data: https://*.paypal.com https://*.paypalobjects.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://api.stripe.com https://*.stripe.com https://apple-pay-gateway.apple.com https://pay.google.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://connect.facebook.net ws: wss:",

              // Forms
              "form-action 'self'",

              // Media
              "media-src 'self'",

              // Workers
              "worker-src 'self' blob: https://*.paypal.com https://*.hcaptcha.com",

              // Child
              "child-src 'self' blob: https://*.paypal.com https://*.paypalobjects.com https://*.hcaptcha.com",

              // Prevent mixed content
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
