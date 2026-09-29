import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uebungsbilder vom Handy sind meist > 1 MB (Standardlimit). Vercel
      // erlaubt maximal 4,5 MB pro Request.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
