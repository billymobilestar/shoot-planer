import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  // Use left join so unassigned scenes (location_id = null) are included
  const { data: scenes, error } = await supabase
    .from("scenes")
    .select("*, locations(name, shoot_day_id)")
    .eq("project_id", projectId)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch shot counts per scene
  const { data: shotCounts } = await supabase
    .from("shots")
    .select("scene_id")
    .eq("project_id", projectId)
    .not("scene_id", "is", null);

  const countMap: Record<string, number> = {};
  if (shotCounts) {
    for (const s of shotCounts) {
      countMap[s.scene_id!] = (countMap[s.scene_id!] || 0) + 1;
    }
  }

  // Fetch shoot days for day number mapping
  const { data: days } = await supabase
    .from("shoot_days")
    .select("id, day_number, title")
    .eq("project_id", projectId)
    .order("day_number");

  const dayMap: Record<string, { day_number: number; title: string | null }> = {};
  if (days) {
    for (const d of days) {
      dayMap[d.id] = { day_number: d.day_number, title: d.title };
    }
  }

  const enriched = (scenes || []).map((scene: any) => ({
    ...scene,
    location_name: scene.locations?.name || null,
    shoot_day_id: scene.locations?.shoot_day_id || null,
    day_number: scene.locations?.shoot_day_id ? dayMap[scene.locations.shoot_day_id]?.day_number ?? null : null,
    day_title: scene.locations?.shoot_day_id ? dayMap[scene.locations.shoot_day_id]?.title ?? null : null,
    shot_count: countMap[scene.id] || 0,
    locations: undefined,
  }));

  return NextResponse.json(enriched);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Get next position
  const { data: existing } = await supabase
    .from("scenes")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("scenes")
    .insert({
      project_id: projectId,
      location_id: body.location_id || null,
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
