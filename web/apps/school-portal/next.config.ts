import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@educloud/ui", "@educloud/api-client", "@educloud/portal-kit"],
  poweredByHeader: false,
  // Lecture videos are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "512mb" } },
};

export default config;
