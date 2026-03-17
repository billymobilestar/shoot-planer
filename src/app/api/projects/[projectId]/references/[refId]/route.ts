import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";
import { createNotifications } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId, refId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.location_id !== undefined) updates.location_id = body.location_id;
  if (body.location_ids !== undefined) {
    updates.location_ids = body.location_ids;
    // Keep legacy location_id in sync
    updates.location_id = body.location_ids.length > 0 ? body.location_ids[0] : null;
  }
  if (body.category !== undefined) updates.category = body.category;
  if (body.image_url !== undefined) updates.image_url = body.image_url;
  if (body.board !== undefined) updates.board = body.board;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.colors !== undefined) updates.colors = body.colors;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await supabase
    .from("shoot_references")
    .update(updates)
    .eq("id", refId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify when a location is assigned to a reference
  const isLocationAssignment = body.location_ids !== undefined || body.location_id !== undefined;
  const hasLocation = (body.location_ids?.length > 0) || (body.location_id != null);
  if (isLocationAssignment && hasLocation && data) {
    // Look up location name
    const locationId = body.location_ids?.[0] ?? body.location_id;
    const { data: loc } = await supabase.from("locations").select("name").eq("id", locationId).single();
    const actorName = getDisplayName(user);
    await createNotifications({
      projectId,
      actorUserId: userId,
      actorName,
      type: "reference_location_assigned",
      title: `${actorName} assigned a reference to ${loc?.name || "a location"}`,
      body: data.title || null,
      resourceId: refId,
      deepLink: `/project/${projectId}?tab=references&ref=${refId}`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { refId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("shoot_references").delete().eq("id", refId);
  return NextResponse.json({ success: true });
}
