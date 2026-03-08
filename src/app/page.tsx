import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MapPin, Camera, ListChecks, Users } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Itinerary Planner",
    description:
      "Organize shoot locations day-by-day with drag-and-drop. Auto-calculate distances and generate Google Maps routes.",
  },
  {
    icon: Camera,
    title: "Shot References",
    description:
      "Build moodboards and assign reference images to specific locations. Keep your visual direction organized.",
  },
  {
    icon: ListChecks,
    title: "Shot List",
    description:
      "Track every shot with descriptions, types, and status. Never miss a shot on location.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share projects with your crew via invite links. Control who can view and who can edit.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-accent">ShootPlaner</span>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative px-6 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary leading-tight">
            Plan Your Shoots,{" "}
            <span className="text-accent">Beautifully</span>
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
            The collaborative shoot planner for filmmakers. Organize locations,
            build moodboards, manage shot lists, and share with your crew.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="px-6 py-3 rounded-lg border border-border text-text-primary hover:bg-bg-card-hover transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-bg-card border border-border rounded-xl p-6 hover:border-border-light transition-colors"
            >
              <f.icon className="w-8 h-8 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {f.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-text-muted text-sm">
        ShootPlaner &mdash; Built for filmmakers.
      </footer>
    </div>
  );
}
