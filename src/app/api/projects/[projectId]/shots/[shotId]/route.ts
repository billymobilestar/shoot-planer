import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";
import { createNotifications } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; shotId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId, shotId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, unknown> = {};
  const fields = ["title", "description", "shot_type", "image_url", "location_id", "status", "position", "notes"];
  for (const field of fields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const { data, error } = await supabase
    .from("shots")
    .update(updates)
    .eq("id", shotId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify on status change only
  if (body.status !== undefined && data) {
    const actorName = getDisplayName(user);
    const statusLabel = body.status === "in_progress" ? "In Progress" : body.status === "completed" ? "Completed" : "Planned";
    await createNotifications({
      projectId,
      actorUserId: userId,
      actorName,
      type: "shot_status_changed",
      title: `${actorName} marked "${data.title}" as ${statusLabel}`,
      body: null,
      resourceId: shotId,
      deepLink: `/project/${projectId}?tab=shots`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; shotId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shotId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("shots").delete().eq("id", shotId);
  return NextResponse.json({ success: true });
}
