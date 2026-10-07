import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "토키 · 사회성 연습", short_name: "토키", description: "화용언어·사회성 연습 및 교육 보조 도구",
    lang: "ko", start_url: "/child", scope: "/", display: "standalone", orientation: "any",
    background_color: "#fff9f0", theme_color: "#6c63ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
