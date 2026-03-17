import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserSubscription, canCreateProject } from "@/lib/subscription";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  // Check subscription limit
  const sub = await getUserSubscription(userId);
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);
  if (!canCreateProject(sub, count || 0)) {
    return NextResponse.json(
      { error: "Project limit reached. Upgrade to Pro for unlimited projects." },
      { status: 403 }
    );
  }

  // Fetch source project
  const { data: source } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the requester owns or is a member of the project
  const isMember = source.owner_id === userId;
  if (!isMember) {
    const { data: membership } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create new project
  const { data: newProject, error: projError } = await supabase
    .from("projects")
    .insert({
      name: `${source.name} (Copy)`,
      description: source.description,
      owner_id: userId,
      cover_image_url: source.cover_image_url,
    })
    .select()
    .single();
  if (projError) return NextResponse.json({ error: projError.message }, { status: 500 });

  // Fetch and duplicate shoot days
  const { data: days } = await supabase
    .from("shoot_days")
    .select("*")
    .eq("project_id", projectId)
    .order("day_number");

  const dayIdMap: Record<string, string> = {};
  for (const day of days || []) {
    const { data: newDay } = await supabase
      .from("shoot_days")
      .insert({
        project_id: newProject.id,
        day_number: day.day_number,
        title: day.title,
        date: day.date,
      })
      .select()
      .single();
    if (newDay) dayIdMap[day.id] = newDay.id;
  }

  // Fetch and duplicate locations
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  const locationIdMap: Record<string, string> = {};
  for (const loc of locations || []) {
    const { data: newLoc } = await supabase
      .from("locations")
      .insert({
        project_id: newProject.id,
        shoot_day_id: loc.shoot_day_id ? dayIdMap[loc.shoot_day_id] : null,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        photo_url: loc.photo_url,
        position: loc.position,
        notes: loc.notes,
      })
      .select()
      .single();
    if (newLoc) locationIdMap[loc.id] = newLoc.id;
  }

  // Fetch and duplicate shots
  const { data: shots } = await supabase
    .from("shots")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  for (const shot of shots || []) {
    await supabase.from("shots").insert({
      project_id: newProject.id,
      title: shot.title,
      description: shot.description,
      shot_type: shot.shot_type,
      image_url: shot.image_url,
      location_id: shot.location_id ? (locationIdMap[shot.location_id] ?? null) : null,
      status: "planned",
      position: shot.position,
      notes: shot.notes,
    });
  }

  return NextResponse.json(newProject, { status: 201 });
}
