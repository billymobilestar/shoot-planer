import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: invite, error } = await supabase
    .from("invite_links")
    .select("*, projects(id, name, description, cover_image_url)")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  return NextResponse.json(invite);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: invite } = await supabase
    .from("invite_links")
    .select("*")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ project_id: invite.project_id, already_member: true });
  }

  // Check if user is owner
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", invite.project_id)
    .single();

  if (project?.owner_id === userId) {
    return NextResponse.json({ project_id: invite.project_id, already_member: true });
  }

  // Add as member
  await supabase.from("project_members").insert({
    project_id: invite.project_id,
    user_id: userId,
    role: invite.role,
    accepted_at: new Date().toISOString(),
  });

  // Increment use count
  await supabase
    .from("invite_links")
    .update({ use_count: (invite.use_count || 0) + 1 })
    .eq("id", invite.id);

  return NextResponse.json({ project_id: invite.project_id, joined: true });
}
