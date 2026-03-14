import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";
import { createNotifications } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { refId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("reference_comments")
    .select("*")
    .eq("reference_id", refId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId, refId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("reference_comments")
    .insert({
      reference_id: refId,
      user_id: userId,
      user_name: getDisplayName(user),
      content: body.content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorName = getDisplayName(user);
  createNotifications({
    projectId,
    actorUserId: userId,
    actorName,
    type: "reference_comment",
    title: `${actorName} commented on a reference`,
    body: body.content?.slice(0, 100) || null,
    resourceId: refId,
    deepLink: `/project/${projectId}?tab=references&ref=${refId}`,
  });

  return NextResponse.json(data, { status: 201 });
}
