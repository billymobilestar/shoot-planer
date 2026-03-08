import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; locationId: string; linkId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { linkId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("location_links").delete().eq("id", linkId);
  return NextResponse.json({ success: true });
}
