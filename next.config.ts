import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/exercise-images/**" },
    ],
    // Hochgeladene Bilder bekommen eindeutige Dateinamen und werden nie
    // ueberschrieben: verkleinerte Kopien 31 Tage cachen statt alle 4 Stunden
    // das Original erneut bei Supabase zu holen.
    minimumCacheTTL: 2678400,
  },
  experimental: {
    serverActions: {
      // Uebungsbilder vom Handy sind meist > 1 MB (Standardlimit). Vercel
      // erlaubt maximal 4,5 MB pro Request.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
