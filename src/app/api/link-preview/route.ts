import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ShootPlaner/1.0; +https://shootplaner.com)",
        Accept: "text/html",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch URL" }, { status: 422 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "Not an HTML page" }, { status: 422 });
    }

    // Only read first 50KB to avoid huge pages
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: "No response body" }, { status: 422 });

    let html = "";
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const maxBytes = 50000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    // Extract Open Graph and meta tags
    const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTagContent(html, "title");
    const description = extractMeta(html, "og:description") || extractMeta(html, "description") || extractMeta(html, "twitter:description");
    const image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || extractMeta(html, "twitter:image:src");

    // Resolve relative image URLs
    let imageUrl = image;
    if (image && !image.startsWith("http")) {
      try {
        imageUrl = new URL(image, url).href;
      } catch {
        imageUrl = null;
      }
    }

    return NextResponse.json({
      title: title || null,
      description: description || null,
      image: imageUrl || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch preview";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

function extractMeta(html: string, name: string): string | null {
  // Match both property="" and name="" attributes
  const patterns = [
    new RegExp(`<meta[^>]*(?:property|name)=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(name)}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractTagContent(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
