"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Check, Zap, ArrowLeft } from "lucide-react";

const features = {
  free: [
    "1 active project",
    "Unlimited shoot days & locations",
    "Shot list management",
    "Moodboard with uploads",
    "Share with viewers",
  ],
  pro: [
    "Unlimited projects",
    "Everything in Free",
    "Unlimited team members",
    "Priority support",
    "Advanced collaboration",
    "Early access to new features",
  ],
};

export default function PricingPage() {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  const monthlyPrice = 14.99;
  const yearlyPrice = 119.99;
  const displayPrice = interval === "month" ? monthlyPrice : yearlyPrice;
  const perMonth = interval === "month" ? monthlyPrice : +(yearlyPrice / 12).toFixed(2);
  const savings = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  async function handleCheckout() {
    if (!isSignedIn) {
      window.location.href = "/sign-up";
      return;
    }

    const priceId = interval === "month"
      ? process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;

    setLoading(interval);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href={isSignedIn ? "/dashboard" : "/"} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xl font-bold text-accent">ShootPlaner</span>
        </Link>
        {!isSignedIn && (
          <Link href="/sign-in" className="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-bg-card-hover transition-colors">
            Sign In
          </Link>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-text-secondary text-lg">
            Start free. Upgrade when you need more projects.
          </p>

          {/* Interval toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setInterval("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "month"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "year"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                Save {savings}%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-bg-card border border-border rounded-xl p-8">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Free</h3>
            <p className="text-text-muted text-sm mb-6">For individual shoots</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-text-primary">$0</span>
              <span className="text-text-muted ml-1">/forever</span>
            </div>
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="block text-center w-full bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2.5 font-medium transition-colors mb-8"
            >
              {isSignedIn ? "Current Plan" : "Get Started"}
            </Link>
            <ul className="space-y-3">
              {features.free.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-bg-card border-2 border-accent rounded-xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
              Pro <Zap className="w-4 h-4 text-accent" />
            </h3>
            <p className="text-text-muted text-sm mb-6">For serious filmmakers</p>
            <div className="mb-1">
              <span className="text-4xl font-bold text-text-primary">${displayPrice}</span>
              <span className="text-text-muted ml-1">/{interval === "month" ? "mo" : "yr"}</span>
            </div>
            {interval === "year" && (
              <p className="text-xs text-accent mb-5">${perMonth}/mo billed annually</p>
            )}
            {interval === "month" && <div className="mb-6" />}
            <button
              onClick={handleCheckout}
              disabled={loading !== null}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50 mb-8"
            >
              {loading ? "Redirecting..." : "Upgrade to Pro"}
            </button>
            <ul className="space-y-3">
              {features.pro.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-8 text-center text-text-muted text-sm">
        ShootPlaner &mdash; Built for filmmakers.
      </footer>
    </div>
  );
}
