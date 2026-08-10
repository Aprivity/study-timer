import type { NextConfig } from "next";

const repositoryBasePath = "/study-timer";
const isGitHubPages = process.env.DEPLOY_TARGET === "github-pages";
const deploymentBasePath = isGitHubPages ? repositoryBasePath : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: deploymentBasePath,
  assetPrefix: deploymentBasePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: deploymentBasePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
