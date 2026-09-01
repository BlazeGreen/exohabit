import type { NextConfig } from "next";

// GitHub Pages serves the site from https://<user>.github.io/<repo>/, so the
// build needs a basePath. Locally NEXT_PUBLIC_BASE_PATH is unset -> "" -> root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
