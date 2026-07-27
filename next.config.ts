import type { NextConfig } from "next";

type ImageRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

function makeMediaRemotePattern(rawUrl?: string): ImageRemotePattern | null {
  const value = rawUrl?.trim();

  if (!value) return null;

  try {
    const url = new URL(value);

    const protocol =
      url.protocol === "http:"
        ? "http"
        : url.protocol === "https:"
          ? "https"
          : null;

    if (!protocol) return null;

    return {
      protocol,
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/media/**",
    };
  } catch {
    return null;
  }
}

const backendMediaPattern =
  makeMediaRemotePattern(process.env.NEXT_PUBLIC_MEDIA_BASE_URL) ||
  makeMediaRemotePattern(process.env.NEXT_PUBLIC_BACKEND_URL) ||
  makeMediaRemotePattern(process.env.NEXT_PUBLIC_API_BASE_URL);

const remotePatterns: ImageRemotePattern[] = [
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "bucket.ammenu.com",
    pathname: "/**",
  },
  ...(backendMediaPattern ? [backendMediaPattern] : []),
];

function originFromEnvironment(rawUrl?: string) {
  try {
    return rawUrl?.trim() ? new URL(rawUrl).origin : null;
  } catch {
    return null;
  }
}

const isDevelopment = process.env.NODE_ENV === "development";
const apiOrigin = originFromEnvironment(process.env.NEXT_PUBLIC_API_BASE_URL);
const connectSources = [
  "'self'",
  ...(apiOrigin ? [apiOrigin] : []),
  ...(isDevelopment ? ["http:", "ws:"] : []),
].join(" ");
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:${isDevelopment ? " http:" : ""};
  font-src 'self' data:;
  connect-src ${connectSources};
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDevelopment ? "" : "upgrade-insecure-requests;"}
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  images: {
    remotePatterns,
    formats: ["image/webp", "image/avif"],
    qualities: [75, 95],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          ...(isDevelopment
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
