import { getSupabaseAdmin } from "@/lib/supabase";
import type { Metadata } from "next";
import DemoView from "./DemoView";

export const metadata: Metadata = {
  title: "Live Demo — KAMAAL Production",
  description:
    "See a real film shoot planned with ShootPlaner. Browse the itinerary, moodboard, and shot list from an actual production.",
  alternates: { canonical: "https://shootplaner.com/demo" },
  openGraph: {
    title: "ShootPlaner Demo — Real Production Planning",
    description: "See how filmmakers use ShootPlaner to plan their shoots end-to-end.",
    url: "https://shootplaner.com/demo",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ShootPlaner Demo" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

const DEMO_PROJECT_ID = "c16410ab-d318-4ed9-8d04-60399c8eacb7";

// Consistent dummy name mapping based on userId
const CREW_NAMES = ["Alex Chen", "Jordan Lee", "Sam Rivera", "Morgan Kim", "Taylor Brooks", "Casey Park"];
function anonymizeName(userId: string): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CREW_NAMES[hash % CREW_NAMES.length];
}

function sanitizeAddress(name: string, address: string | null): string | null {
  if (!address) return null;
  const lowerName = name.toLowerCase();
  const lowerAddr = address.toLowerCase();
  if (lowerName.includes("airbnb") || lowerAddr.includes("airbnb") || lowerAddr.includes("private")) {
    return "Base Camp — Private Location, Los Angeles, CA";
  }
  return address;
}

export default async function DemoPage() {
  const supabase = getSupabaseAdmin();

  // Fetch all project data in parallel
  const [
    { data: project },
    { data: days },
    { data: locations },
    { data: references },
    { data: shots },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", DEMO_PROJECT_ID).single(),
    supabase.from("shoot_days").select("*").eq("project_id", DEMO_PROJECT_ID).order("day_number"),
    supabase.from("locations").select("*").eq("project_id", DEMO_PROJECT_ID).order("position"),
    supabase.from("shoot_references").select("*").eq("project_id", DEMO_PROJECT_ID).order("position"),
    supabase.from("shots").select("*").eq("project_id", DEMO_PROJECT_ID).order("position"),
  ]);

  if (!project) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">Demo unavailable.</p>
      </div>
    );
  }

  // Sanitize locations — redact Airbnb addresses
  const sanitizedLocations = (locations || []).map((loc) => ({
    ...loc,
    address: sanitizeAddress(loc.name, loc.address),
  }));

  // Build ShootDayWithLocations
  const daysWithLocations = (days || []).map((day) => ({
    ...day,
    locations: sanitizedLocations.filter((l) => l.shoot_day_id === day.id),
  }));

  // Fetch and anonymize location notes
  const { data: notes } = await supabase
    .from("location_notes")
    .select("*")
    .in("location_id", sanitizedLocations.map((l) => l.id))
    .order("created_at", { ascending: false });

  const anonymizedNotes = (notes || []).map((n) => ({
    ...n,
    user_name: anonymizeName(n.user_id),
    user_id: "demo",
  }));

  // Fetch and anonymize reference reactions + comments
  const refIds = (references || []).map((r) => r.id);
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    refIds.length
      ? supabase.from("reference_reactions").select("*").in("reference_id", refIds)
      : Promise.resolve({ data: [] }),
    refIds.length
      ? supabase.from("reference_comments").select("*").in("reference_id", refIds).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const anonymizedReactions = (reactions || []).map((r) => ({
    ...r,
    user_name: anonymizeName(r.user_id),
    user_id: "demo",
  }));

  const anonymizedComments = (comments || []).map((c) => ({
    ...c,
    user_name: anonymizeName(c.user_id),
    user_id: "demo",
  }));

  return (
    <DemoView
      project={{ ...project, name: "Golden Hour — Feature Film Demo" }}
      daysWithLocations={daysWithLocations}
      locations={sanitizedLocations}
      references={references || []}
      shots={shots || []}
      notes={anonymizedNotes}
      reactions={anonymizedReactions}
      comments={anonymizedComments}
    />
  );
}
