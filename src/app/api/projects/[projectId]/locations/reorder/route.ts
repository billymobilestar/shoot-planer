import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const updates: { id: string; shoot_day_id: string; position: number }[] = body.updates;

  await Promise.all(
    updates.map((u) =>
      supabase
        .from("locations")
        .update({ shoot_day_id: u.shoot_day_id, position: u.position })
        .eq("id", u.id)
    )
  );

  return NextResponse.json({ success: true });
}
