import type { NextConfig } from "next";

function serverActionOrigins() {
  const hosts = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]) {
    if (!raw?.trim()) continue;
    try {
      hosts.add(new URL(raw.trim()).host);
    } catch {
      /* ignore invalid */
    }
  }
  return [...hosts];
}

const actionOrigins = serverActionOrigins();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Must exceed IMAGE_MAX_BYTES (10 MB) plus multipart headers.
      bodySizeLimit: "12mb",
      ...(actionOrigins.length ? { allowedOrigins: actionOrigins } : {}),
    },
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
