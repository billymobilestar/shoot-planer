import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check access
  let role: "owner" | "admin" | "viewer" = "viewer";
  if (project.owner_id === userId) {
    role = "owner";
  } else {
    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    role = membership.role === "admin" ? "admin" : "viewer";
  }

  // Get shoot days with locations
  const { data: days } = await supabase
    .from("shoot_days")
    .select("*")
    .eq("project_id", projectId)
    .order("day_number");

  const daysWithLocations = await Promise.all(
    (days || []).map(async (day) => {
      const { data: locations } = await supabase
        .from("locations")
        .select("*")
        .eq("shoot_day_id", day.id)
        .order("position");

      const locsWithScenes = await Promise.all(
        (locations || []).map(async (loc) => {
          const { data: scenes } = await supabase
            .from("scenes")
            .select("*")
            .eq("location_id", loc.id)
            .order("position");
          return { ...loc, scenes: scenes || [] };
        })
      );

      return { ...day, locations: locsWithScenes };
    })
  );

  return NextResponse.json({ ...project, role, days: daysWithLocations });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = project.owner_id === userId;
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (!isOwner && membership?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
  if (body.start_date !== undefined) updates.start_date = body.start_date;

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("projects").delete().eq("id", projectId);
  return NextResponse.json({ success: true });
}
