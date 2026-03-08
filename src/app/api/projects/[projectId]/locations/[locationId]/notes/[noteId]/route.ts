import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string; noteId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("location_notes").delete().eq("id", noteId);
  return NextResponse.json({ success: true });
}
