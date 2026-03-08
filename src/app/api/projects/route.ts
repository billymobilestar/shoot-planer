import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserSubscription, canCreateProject } from "@/lib/subscription";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Get projects where user is owner
  const { data: owned } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  // Get projects where user is a member
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  const memberProjectIds = (memberships || []).map((m) => m.project_id);

  let memberProjects: typeof owned = [];
  if (memberProjectIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .in("id", memberProjectIds)
      .order("created_at", { ascending: false });
    memberProjects = data;
  }

  return NextResponse.json({
    owned: owned || [],
    collaborations: memberProjects || [],
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Check subscription limits
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

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name: body.name, description: body.description || null, owner_id: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create default Day 1
  await supabase
    .from("shoot_days")
    .insert({ project_id: project.id, day_number: 1, title: "Day 1" });

  return NextResponse.json(project, { status: 201 });
}
