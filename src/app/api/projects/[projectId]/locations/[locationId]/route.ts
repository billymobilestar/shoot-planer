import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";
import { createNotifications } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId, locationId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, unknown> = {};
  const fields = [
    "name", "description", "address", "latitude", "longitude",
    "photo_url", "drive_time_from_previous", "drive_distance_from_previous",
    "position", "shoot_day_id", "notes",
    "scene_text", "scene_file_url", "scene_file_name",
    "prep_minutes", "shoot_minutes", "wrap_minutes", "break_after_minutes",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", locationId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only notify on meaningful user-initiated edits, not drive time/position updates
  const meaningfulFields = ["name", "description", "address", "photo_url", "notes"];
  const hasMeaningfulChange = meaningfulFields.some((f) => body[f] !== undefined);
  if (hasMeaningfulChange && data) {
    const actorName = getDisplayName(user);
    await createNotifications({
      projectId,
      actorUserId: userId,
      actorName,
      type: "location_updated",
      title: `${actorName} updated ${data.name}`,
      body: body.address || null,
      resourceId: locationId,
      deepLink: `/project/${projectId}?tab=itinerary&loc=${locationId}`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("locations").delete().eq("id", locationId);
  return NextResponse.json({ success: true });
}
