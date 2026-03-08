import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getDisplayName } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { refId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("reference_reactions")
    .select("*")
    .eq("reference_id", refId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; refId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const { refId } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Toggle: if reaction exists, remove it; otherwise add it
  const { data: existing } = await supabase
    .from("reference_reactions")
    .select("id")
    .eq("reference_id", refId)
    .eq("user_id", userId)
    .eq("emoji", body.emoji)
    .single();

  if (existing) {
    await supabase.from("reference_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase
    .from("reference_reactions")
    .insert({
      reference_id: refId,
      user_id: userId,
      user_name: getDisplayName(user),
      emoji: body.emoji,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: "added" }, { status: 201 });
}
