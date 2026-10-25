import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@educloud/ui", "@educloud/api-client", "@educloud/portal-kit"],
  poweredByHeader: false,
};

export default config;
