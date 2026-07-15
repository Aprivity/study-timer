import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const repositoryBasePath = "/study-timer";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: isProduction ? repositoryBasePath : "",
  assetPrefix: isProduction ? repositoryBasePath : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
