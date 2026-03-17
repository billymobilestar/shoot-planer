import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check access
  if (project.owner_id !== userId) {
    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: days }, { data: locations }, { data: shots }, { data: references }, { data: members }] =
    await Promise.all([
      supabase.from("shoot_days").select("*").eq("project_id", projectId).order("day_number"),
      supabase.from("locations").select("*").eq("project_id", projectId).order("position"),
      supabase.from("shots").select("*").eq("project_id", projectId).order("position"),
      supabase.from("references").select("*").eq("project_id", projectId).order("created_at"),
      supabase.from("project_members").select("user_id, role, user_name, user_email").eq("project_id", projectId),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      cover_image_url: project.cover_image_url,
      created_at: project.created_at,
      updated_at: project.updated_at,
    },
    shoot_days: days || [],
    locations: locations || [],
    shots: shots || [],
    references: references || [],
    team: members || [],
  };

  const filename = `${project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-export.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
