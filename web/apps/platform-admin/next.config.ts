import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@educloud/ui", "@educloud/api-client"],
  poweredByHeader: false,
};

export default config;
