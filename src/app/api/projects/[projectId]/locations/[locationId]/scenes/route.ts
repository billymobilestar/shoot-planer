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
    .from("scenes")
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

  const { projectId, locationId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Get next position
  const { data: existing } = await supabase
    .from("scenes")
    .select("position")
    .eq("location_id", locationId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("scenes")
    .insert({
      location_id: locationId,
      project_id: projectId,
      title: body.title || null,
      scene_text: body.scene_text || null,
      scene_file_url: body.scene_file_url || null,
      scene_file_name: body.scene_file_name || null,
      duration_minutes: body.duration_minutes ?? 0,
      position: body.position ?? nextPosition,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
