import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function detectPlatform(url: string): string {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  if (/pinterest\.com/i.test(url)) return "pinterest";
  return "other";
}

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

async function fetchOgData(
  url: string,
  baseUrl: string
): Promise<{ title: string | null; image: string | null }> {
  try {
    const res = await fetch(
      `${baseUrl}/api/og?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) return await res.json();
  } catch {}
  return { title: null, image: null };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("location_links")
    .select("*")
    .eq("location_id", locationId)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const platform = detectPlatform(body.url);

  // Get thumbnail: YouTube has a direct URL, others use OG fetch
  let thumbnail_url: string | null = null;
  let ogTitle: string | null = null;

  if (platform === "youtube") {
    thumbnail_url = getYoutubeThumbnail(body.url);
  }

  // Fetch OG data for all links to get title and thumbnail
  const baseUrl = new URL(request.url).origin;
  const og = await fetchOgData(body.url, baseUrl);
  ogTitle = og.title;
  if (!thumbnail_url && og.image) {
    thumbnail_url = og.image;
  }

  const { data, error } = await supabase
    .from("location_links")
    .insert({
      location_id: locationId,
      url: body.url,
      title: body.title || ogTitle || null,
      platform,
      thumbnail_url,
      position: body.position ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
