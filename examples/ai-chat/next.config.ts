import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-protocol/ai", "@agent-protocol/core"],
};

export default nextConfig;
