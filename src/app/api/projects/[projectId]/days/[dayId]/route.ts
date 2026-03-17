import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; dayId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.date !== undefined) updates.date = body.date;
  if (body.day_number !== undefined) updates.day_number = body.day_number;

  const { data, error } = await supabase
    .from("shoot_days")
    .update(updates)
    .eq("id", dayId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string; dayId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, dayId } = await params;
  const supabase = getSupabaseAdmin();

  // Check query param: ?mode=clear keeps the day but removes its locations
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "clear") {
    // Remove all locations (cascade will handle scenes etc.)
    await supabase.from("locations").delete().eq("shoot_day_id", dayId);
    // Reset title to default
    const { data: day } = await supabase.from("shoot_days").select("day_number").eq("id", dayId).single();
    if (day) {
      await supabase.from("shoot_days").update({ title: `Day ${day.day_number}` }).eq("id", dayId);
    }
    return NextResponse.json({ success: true, cleared: true });
  }

  // Default: delete the day and renumber remaining days
  await supabase.from("shoot_days").delete().eq("id", dayId);

  // Renumber remaining days sequentially
  const { data: remaining } = await supabase
    .from("shoot_days")
    .select("id, day_number")
    .eq("project_id", projectId)
    .order("day_number");

  if (remaining && remaining.length > 0) {
    await Promise.all(
      remaining.map((d, idx) => {
        const newNum = idx + 1;
        if (d.day_number !== newNum) {
          return supabase.from("shoot_days").update({ day_number: newNum }).eq("id", d.id);
        }
        return Promise.resolve();
      })
    );
  }

  return NextResponse.json({ success: true });
}
