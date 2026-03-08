import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/subscription";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getUserSubscription(userId);
  return NextResponse.json(sub);
}
