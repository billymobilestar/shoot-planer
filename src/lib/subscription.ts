import { getSupabaseAdmin } from "./supabase";

export interface UserSubscription {
  plan: "free" | "pro";
  billing_interval: string | null;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

const FREE_SUB: UserSubscription = {
  plan: "free",
  billing_interval: null,
  status: "active",
  current_period_end: null,
  stripe_customer_id: null,
};

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data || data.plan === "free") return FREE_SUB;

    // Check if subscription has expired
    if (data.status === "canceled" && data.current_period_end) {
      const endDate = new Date(data.current_period_end);
      if (endDate < new Date()) return FREE_SUB;
    }

    return {
      plan: data.plan,
      billing_interval: data.billing_interval,
      status: data.status,
      current_period_end: data.current_period_end,
      stripe_customer_id: data.stripe_customer_id,
    };
  } catch {
    return FREE_SUB;
  }
}

export function canCreateProject(sub: UserSubscription, currentProjectCount: number): boolean {
  if (sub.plan === "pro" && sub.status !== "past_due") return true;
  return currentProjectCount < 1; // Free users get 1 project
}
