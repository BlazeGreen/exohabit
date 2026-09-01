import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Planet detail pages beyond the top-300 statically generated at build time
  // render on demand and read their JSON via fs (lib/data.ts) — make sure the
  // whole synced data directory is traced into the server function bundle.
  outputFileTracingIncludes: {
    "/**": ["./public/data/**"],
  },
};

export default nextConfig;
