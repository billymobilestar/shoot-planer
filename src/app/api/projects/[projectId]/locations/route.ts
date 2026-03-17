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

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("locations")
    .insert({
      project_id: projectId,
      shoot_day_id: body.shoot_day_id,
      name: body.name,
      description: body.description || null,
      address: body.address || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      photo_url: body.photo_url || null,
      drive_time_from_previous: body.drive_time_from_previous || null,
      drive_distance_from_previous: body.drive_distance_from_previous || null,
      position: body.position ?? 0,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorName = getDisplayName(user);
  await createNotifications({
    projectId,
    actorUserId: userId,
    actorName,
    type: "location_added",
    title: `${actorName} added ${body.name}`,
    body: body.address || null,
    resourceId: data.id,
    deepLink: `/project/${projectId}?tab=itinerary&loc=${data.id}`,
  });

  return NextResponse.json(data, { status: 201 });
}
