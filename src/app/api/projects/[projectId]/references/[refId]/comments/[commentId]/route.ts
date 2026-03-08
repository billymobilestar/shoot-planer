import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string; commentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("reference_comments").delete().eq("id", commentId);
  return NextResponse.json({ success: true });
}
