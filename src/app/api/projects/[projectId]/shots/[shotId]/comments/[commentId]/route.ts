import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const supabase = getSupabaseAdmin();

  // Only allow deleting own comments
  const { data: comment } = await supabase
    .from("shot_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment || comment.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("shot_comments").delete().eq("id", commentId);
  return NextResponse.json({ success: true });
}
