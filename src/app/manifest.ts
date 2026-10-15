import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UCL · UEL Tahmin Yarışması",
    short_name: "Tahmin",
    description: "Şampiyonlar Ligi ve Avrupa Ligi maçlarını tahmin et, puan topla.",
    start_url: "/maclar",
    scope: "/",
    display: "standalone",
    background_color: "#0c0a1a",
    theme_color: "#0c0a1a",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
