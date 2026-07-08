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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  images: {
    remotePatterns,
    formats: ["image/webp", "image/avif"],
    qualities: [75, 95],
  },
};

export default nextConfig;
