import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// These platforms serve OG tags to known social media crawlers
const CRAWLER_UA = "WhatsApp/2.23.20.0";
// Fallback with a normal browser UA for sites that block crawlers
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Try platform-specific oEmbed APIs first (most reliable)
  const oembedResult = await tryOembed(url);
  if (oembedResult?.image) return NextResponse.json(oembedResult);

  // Try fetching with crawler UA first (TikTok, Facebook, Instagram serve OG to crawlers)
  const crawlerResult = await fetchOgTags(url, CRAWLER_UA);
  if (crawlerResult?.image) return NextResponse.json(crawlerResult);

  // Fallback: try with browser UA
  const browserResult = await fetchOgTags(url, BROWSER_UA);
  if (browserResult?.image || browserResult?.title) return NextResponse.json(browserResult);

  // If oEmbed returned a title but no image, still use it
  if (oembedResult?.title) return NextResponse.json(oembedResult);

  return NextResponse.json({ title: null, image: null, description: null });
}

async function fetchOgTags(
  url: string,
  userAgent: string
): Promise<{ title: string | null; image: string | null; description: string | null } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    // Only read text for HTML responses
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = await res.text();

    const ogTitle =
      extractMeta(html, 'property="og:title"') ||
      extractMeta(html, "property='og:title'") ||
      extractMeta(html, 'name="og:title"') ||
      extractMeta(html, 'property="twitter:title"') ||
      extractTitle(html);

    const ogImage =
      extractMeta(html, 'property="og:image"') ||
      extractMeta(html, "property='og:image'") ||
      extractMeta(html, 'name="og:image"') ||
      extractMeta(html, 'property="twitter:image"') ||
      extractMeta(html, 'name="twitter:image"') ||
      extractMeta(html, 'property="twitter:image:src"');

    const ogDescription =
      extractMeta(html, 'property="og:description"') ||
      extractMeta(html, "property='og:description'") ||
      extractMeta(html, 'name="og:description"') ||
      extractMeta(html, 'name="description"');

    return {
      title: ogTitle || null,
      image: ogImage || null,
      description: ogDescription || null,
    };
  } catch {
    return null;
  }
}

async function tryOembed(
  url: string
): Promise<{ title: string | null; image: string | null; description: string | null } | null> {
  let oembedUrl: string | null = null;

  if (/tiktok\.com/i.test(url)) {
    oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (/youtube\.com|youtu\.be/i.test(url)) {
    oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  } else if (/vimeo\.com/i.test(url)) {
    oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  }

  if (!oembedUrl) return null;

  try {
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || null,
      image: data.thumbnail_url || null,
      description: data.author_name ? `by ${data.author_name}` : null,
    };
  } catch {
    return null;
  }
}

function extractMeta(html: string, attr: string): string | null {
  // Handle both content before and after the attribute, with both quote styles
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*${escapedAttr}[^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${escapedAttr}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}
