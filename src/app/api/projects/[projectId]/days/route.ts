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

  const { data: days } = await supabase
    .from("shoot_days")
    .select("*")
    .eq("project_id", projectId)
    .order("day_number");

  const daysWithLocations = await Promise.all(
    (days || []).map(async (day) => {
      const { data: locations } = await supabase
        .from("locations")
        .select("*")
        .eq("shoot_day_id", day.id)
        .order("position");

      const locsWithScenes = await Promise.all(
        (locations || []).map(async (loc) => {
          const { data: scenes } = await supabase
            .from("scenes")
            .select("*")
            .eq("location_id", loc.id)
            .order("position");
          return { ...loc, scenes: scenes || [] };
        })
      );

      return { ...day, locations: locsWithScenes };
    })
  );

  return NextResponse.json(daysWithLocations);
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { projectId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Get max day number
  const { data: existing } = await supabase
    .from("shoot_days")
    .select("day_number")
    .eq("project_id", projectId)
    .order("day_number", { ascending: false })
    .limit(1);

  const nextDayNumber = existing && existing.length > 0 ? existing[0].day_number + 1 : 1;

  const { data, error } = await supabase
    .from("shoot_days")
    .insert({
      project_id: projectId,
      day_number: nextDayNumber,
      title: body.title || `Day ${nextDayNumber}`,
      date: body.date || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorName = getDisplayName(user);
  await createNotifications({
    projectId,
    actorUserId: userId,
    actorName,
    type: "day_added",
    title: `${actorName} added Day ${nextDayNumber}`,
    body: data.title !== `Day ${nextDayNumber}` ? data.title : null,
    resourceId: data.id,
    deepLink: `/project/${projectId}?tab=itinerary`,
  });

  return NextResponse.json(data, { status: 201 });
}
