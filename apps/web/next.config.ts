import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@wtw/core", "@wtw/tokens", "@wtw/ui"],
  images: { remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }] },
};

export default withMicrofrontends(nextConfig);
