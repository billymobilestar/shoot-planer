import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const body = await request.json();
  const priceId = body.priceId;
  if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Check if user already has a Stripe customer ID
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user?.emailAddresses?.[0]?.emailAddress,
      metadata: { clerk_user_id: userId },
    });
    customerId = customer.id;

    // Upsert subscription record with customer ID
    await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan: "free",
        status: "active",
      }, { onConflict: "user_id" });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { clerk_user_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
