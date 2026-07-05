import type { NextConfig } from "next";

type ImageRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

function backendMediaRemotePattern(): ImageRemotePattern | null {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!backendUrl) return null;

  try {
    const url = new URL(backendUrl);
    const protocol: "http" | "https" | null =
      url.protocol === "http:" ? "http" : url.protocol === "https:" ? "https" : null;

    if (!protocol) return null;

    return {
      protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: "/media/**",
    };
  } catch {
    return null;
  }
}

const backendMediaPattern = backendMediaRemotePattern();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bucket.ammenu.com",
        pathname: "/**",
      },
      ...(backendMediaPattern ? [backendMediaPattern] : []),
    ],
    formats: ["image/webp", "image/avif"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
