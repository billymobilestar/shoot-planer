import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as unknown as {
        items: { data: Array<{ price: { id: string; recurring?: { interval: string } } }> };
        current_period_end: number;
      };
      const interval = subscription.items.data[0]?.price.recurring?.interval;

      await supabase
        .from("subscriptions")
        .upsert({
          user_id: session.metadata?.clerk_user_id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: "pro",
          billing_interval: interval || "month",
          status: "active",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "user_id" });
      break;
    }

    case "customer.subscription.updated": {
      const subObj = event.data.object as unknown as {
        customer: string;
        items: { data: Array<{ price: { recurring?: { interval: string } } }> };
        cancel_at_period_end: boolean;
        status: string;
        current_period_end: number;
      };
      const customerId = subObj.customer;

      const customer = await getStripe().customers.retrieve(customerId);
      const clerkUserId = (customer as Stripe.Customer).metadata?.clerk_user_id;
      if (!clerkUserId) break;

      const interval = subObj.items.data[0]?.price.recurring?.interval;
      const isCanceled = subObj.cancel_at_period_end;

      await supabase
        .from("subscriptions")
        .update({
          status: isCanceled ? "canceled" : subObj.status,
          billing_interval: interval,
          current_period_end: new Date(subObj.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.deleted": {
      const delSub = event.data.object as unknown as { customer: string };
      const customerId = delSub.customer;

      await supabase
        .from("subscriptions")
        .update({
          plan: "free",
          status: "canceled",
          stripe_subscription_id: null,
          billing_interval: null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as { customer: string };
      const customerId = invoice.customer;

      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
