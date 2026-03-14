import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/sign-in", "/sign-up"],
        disallow: ["/dashboard", "/project/", "/api/", "/invite/"],
      },
    ],
    sitemap: "https://shootplaner.com/sitemap.xml",
    host: "https://shootplaner.com",
  };
}
