import type { MetadataRoute } from "next";
import { APP_NAME, THEME_COLOR } from "@/lib/appTheme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} – Kaderstatistik`,
    short_name: APP_NAME,
    description: "Anwesenheit, Training und Spiele der E-Jugend organisieren",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    lang: "de",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
