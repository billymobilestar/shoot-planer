import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("location_photos")
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

  const { data, error } = await supabase
    .from("location_photos")
    .insert({
      location_id: locationId,
      image_url: body.image_url,
      caption: body.caption || null,
      position: body.position ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("id");
  if (!photoId) return NextResponse.json({ error: "Missing photo id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  await supabase.from("location_photos").delete().eq("id", photoId);
  return NextResponse.json({ success: true });
}
