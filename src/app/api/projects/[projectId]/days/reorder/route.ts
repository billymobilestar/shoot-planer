import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function isDayNumberTitle(title: string | null): boolean {
  return title != null && /^day\s*\d+$/i.test(title.trim());
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: { id: string; day_number: number }[] = body.updates;

  // Fetch current titles so we know whether to auto-update them
  const { data: days } = await supabase
    .from("shoot_days")
    .select("id, title")
    .in("id", updates.map((u) => u.id));

  const titleMap: Record<string, string | null> = {};
  for (const d of days || []) titleMap[d.id] = d.title;

  // Use a temporary day_number to avoid unique constraint violations during the swap.
  const tempDayNumber = 99999;
  await supabase.from("shoot_days").update({ day_number: tempDayNumber }).eq("id", updates[0].id);

  // Set second to first's original day_number, updating title if it matches "Day N"
  const secondTitle = titleMap[updates[1].id];
  await supabase
    .from("shoot_days")
    .update({
      day_number: updates[1].day_number,
      ...(isDayNumberTitle(secondTitle) ? { title: `Day ${updates[1].day_number}` } : {}),
    })
    .eq("id", updates[1].id);

  // Set first to second's original day_number, updating title if it matches "Day N"
  const firstTitle = titleMap[updates[0].id];
  await supabase
    .from("shoot_days")
    .update({
      day_number: updates[0].day_number,
      ...(isDayNumberTitle(firstTitle) ? { title: `Day ${updates[0].day_number}` } : {}),
    })
    .eq("id", updates[0].id);

  return NextResponse.json({ success: true });
}
