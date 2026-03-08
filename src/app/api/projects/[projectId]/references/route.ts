import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("shoot_references")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge legacy location_id into location_ids for backward compatibility
  const enriched = (data || []).map((ref: Record<string, unknown>) => {
    const ids = (ref.location_ids as string[]) || [];
    if (ref.location_id && !ids.includes(ref.location_id as string)) {
      return { ...ref, location_ids: [ref.location_id as string, ...ids] };
    }
    return { ...ref, location_ids: ids };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("shoot_references")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("shoot_references")
    .insert({
      project_id: projectId,
      image_url: body.image_url,
      title: body.title || null,
      description: body.description || null,
      location_id: body.location_ids?.length ? body.location_ids[0] : (body.location_id || null),
      location_ids: body.location_ids || (body.location_id ? [body.location_id] : []),
      category: body.category || "moodboard",
      board: body.board || null,
      tags: body.tags || [],
      colors: body.colors || [],
      notes: body.notes || null,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-set project cover image if none exists
  const { data: project } = await supabase
    .from("projects")
    .select("cover_image_url")
    .eq("id", projectId)
    .single();

  if (project && !project.cover_image_url && body.image_url) {
    await supabase
      .from("projects")
      .update({ cover_image_url: body.image_url })
      .eq("id", projectId);
  }

  return NextResponse.json(data, { status: 201 });
}
