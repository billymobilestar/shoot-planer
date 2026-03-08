import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  // Get project owner
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  const { data: members, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("invited_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark which one is the owner
  const result = (members || []).map((m) => ({
    ...m,
    isOwner: m.user_id === project?.owner_id,
  }));

  // Add owner as first entry if not in members
  if (project && !result.find((m) => m.user_id === project.owner_id)) {
    result.unshift({
      id: "owner",
      project_id: projectId,
      user_id: project.owner_id,
      email: null,
      role: "admin" as const,
      invited_at: "",
      accepted_at: "",
      isOwner: true,
    });
  }

  // Resolve Clerk user names
  const clerk = await clerkClient();
  const userIds = [...new Set(result.map((m) => m.user_id).filter(Boolean))];
  const userMap = new Map<string, { name: string; email: string; imageUrl: string }>();

  for (const uid of userIds) {
    try {
      const user = await clerk.users.getUser(uid);
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
      const email = user.emailAddresses?.[0]?.emailAddress || null;
      userMap.set(uid, {
        name: name || email || uid,
        email: email || "",
        imageUrl: user.imageUrl || "",
      });
    } catch {
      // User may have been deleted
    }
  }

  const enriched = result.map((m) => {
    const info = userMap.get(m.user_id);
    return {
      ...m,
      displayName: info?.name || m.email || m.user_id,
      email: m.email || info?.email || null,
      avatarUrl: info?.imageUrl || null,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("project_members")
    .insert({
      project_id: projectId,
      user_id: body.user_id || "",
      email: body.email,
      role: body.role || "viewer",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
