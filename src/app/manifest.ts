import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShootPlaner",
    short_name: "ShootPlaner",
    description:
      "The collaborative shoot planner for filmmakers. Organize locations, build moodboards, manage shot lists.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#c87040",
    orientation: "portrait-primary",
    categories: ["productivity", "entertainment"],
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    screenshots: [
      {
        src: "/og-image.png",
        sizes: "1200x630",
        type: "image/png",
      },
    ],
  };
}
