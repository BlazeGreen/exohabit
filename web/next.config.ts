import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Planet detail pages beyond the top-300 statically generated at build time
  // render on demand and read their JSON via fs (lib/data.ts). Trace the data
  // files into that route's function bundle only — not every route.
  outputFileTracingIncludes: {
    "/planets/[id]": ["./public/data/planets/**", "./public/data/index.json"],
  },
};

export default nextConfig;
