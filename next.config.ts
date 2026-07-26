import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/art/**",
      },
    ],
  },
};

export default nextConfig;
