import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export const PLANS = {
  free: {
    name: "Free",
    maxProjects: 1,
    price: null,
  },
  pro_monthly: {
    name: "Pro",
    maxProjects: Infinity,
    price: 1499, // cents
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    interval: "month" as const,
  },
  pro_yearly: {
    name: "Pro",
    maxProjects: Infinity,
    price: 11999, // cents ($119.99/year = ~$10/mo)
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    interval: "year" as const,
  },
} as const;
