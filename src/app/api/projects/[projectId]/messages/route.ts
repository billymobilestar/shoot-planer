import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";
import { createNotifications } from "@/lib/notifications";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const before = url.searchParams.get("before"); // cursor-based pagination

  let query = supabase
    .from("project_messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const displayName = getDisplayName(user);
  const avatarUrl = user?.imageUrl || null;

  const { data, error } = await supabase
    .from("project_messages")
    .insert({
      project_id: projectId,
      user_id: userId,
      user_name: displayName,
      user_avatar_url: avatarUrl,
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create notifications for other project members
  await createNotifications({
    projectId,
    actorUserId: userId,
    actorName: displayName,
    type: "chat_message",
    title: `${displayName} sent a message`,
    body: content.length > 100 ? content.slice(0, 100) + "..." : content,
    resourceId: data.id,
    deepLink: `/project/${projectId}?tab=chat`,
  });

  return NextResponse.json(data, { status: 201 });
}
