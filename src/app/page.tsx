import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MapPin, Camera, ListChecks, Users, Route, Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShootPlaner — Film Shoot Planning App for Filmmakers",
  description:
    "Plan your film shoots collaboratively. Build itineraries, moodboards, and shot lists. Share with your crew via invite links. Free to start.",
  alternates: { canonical: "https://shootplaner.com" },
  openGraph: {
    title: "ShootPlaner — Plan Your Film Shoots, Beautifully",
    description:
      "The all-in-one shoot planner for filmmakers. Organize locations, build moodboards, manage shot lists, and collaborate with your crew.",
    url: "https://shootplaner.com",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://shootplaner.com/#app",
      name: "ShootPlaner",
      url: "https://shootplaner.com",
      description:
        "Collaborative film shoot planning app for filmmakers. Build itineraries, moodboards, shot lists and share with your crew.",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        description: "Free plan available",
      },
      featureList: [
        "Shoot itinerary planning",
        "Location management with Google Maps integration",
        "Moodboard and reference images",
        "Shot list management",
        "Team collaboration and sharing",
        "Drive time calculation",
        "Link references from Instagram, TikTok, Pinterest",
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://shootplaner.com/#org",
      name: "ShootPlaner",
      url: "https://shootplaner.com",
      logo: {
        "@type": "ImageObject",
        url: "https://shootplaner.com/icon-512.png",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://shootplaner.com/#website",
      url: "https://shootplaner.com",
      name: "ShootPlaner",
      publisher: { "@id": "https://shootplaner.com/#org" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://shootplaner.com/dashboard?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-accent">ShootPlaner</span>
        <div className="flex gap-3 items-center">
          <Link
            href="/demo"
            className="hidden sm:inline-flex px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            Demo
          </Link>
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
        <div className="absolute inset-0 bg-linear-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary leading-tight">
            Plan Your Shoots,{" "}
            <span className="text-accent">Beautifully</span>
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
            The collaborative shoot planner for filmmakers. Organize locations,
            build moodboards, manage shot lists, and share with your crew.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 rounded-lg border border-border text-text-primary hover:bg-bg-card-hover transition-colors text-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              View Live Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-text-muted">
            See a real production planned with ShootPlaner
          </p>
        </div>
      </section>

      {/* Hero product screenshot */}
      <section className="px-6 pb-10 max-w-6xl mx-auto">
        <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
          <img
            src="/screenshots/projects.png"
            alt="ShootPlaner dashboard showing all your projects"
            className="w-full object-cover object-top"
          />
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

      {/* Feature Showcase */}
      <section className="px-6 py-20 max-w-6xl mx-auto space-y-28">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Everything on one page</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            No more spreadsheets, group chats, or lost call sheets. ShootPlaner keeps your whole production in sync.
          </p>
        </div>

        {/* Feature 1: Itinerary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <MapPin className="w-3.5 h-3.5" />
              Itinerary Planner
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Plan every location, every day</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Build your shoot schedule day by day. Add locations, auto-calculate drive times between each stop, and share a Google Maps route with your entire crew in one tap.
            </p>
            <ul className="space-y-2.5">
              {[
                "Drag and drop to reorder locations",
                "Drive time calculated automatically",
                "One-click Google Maps route for the full day",
                "Team comments on every location",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
              <img
                src="/screenshots/distance1.png"
                alt="Itinerary planner with locations and drive times"
                className="w-full object-cover object-top"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-bg-card">
              <img
                src="/screenshots/distance2.png"
                alt="Close-up of auto-calculated drive time between locations"
                className="w-full object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* Feature 2: Moodboard — image left */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first space-y-3">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
              <img
                src="/screenshots/moodboardlocations.png"
                alt="Moodboard references organised by assigned locations"
                className="w-full object-cover object-top"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-bg-card">
              <img
                src="/screenshots/assignlocations.png"
                alt="Assigning a location to a reference image"
                className="w-full object-cover object-top"
              />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Camera className="w-3.5 h-3.5" />
              Moodboard
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Visual direction, always in reach</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Upload reference images or paste links from Instagram, Pinterest, TikTok, and more. Organise by board, tag locations, and let your crew react and comment in real time.
            </p>
            <ul className="space-y-2.5">
              {[
                "Paste links from any platform — auto-preview generated",
                "Organise into boards per scene or look",
                "Emoji reactions and comments from your crew",
                "Assign references directly to locations",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3: Shot List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <ListChecks className="w-3.5 h-3.5" />
              Shot List
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Never miss a shot on set</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Track every shot with title, type, reference image, and status. Mark shots in progress or completed as you go — your whole team stays in sync throughout the day.
            </p>
            <ul className="space-y-2.5">
              {[
                "Attach reference images to individual shots",
                "Shot types: wide, close-up, aerial, and more",
                "Status tracking: planned, in progress, completed",
                "Linked to locations so context is always clear",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
              <img
                src="/screenshots/shotstatus.png"
                alt="Shot status progression from planned to completed"
                className="w-full object-cover object-top"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-bg-card">
              <img
                src="/screenshots/shotlist.png"
                alt="Shot list with types, reference images and location tags"
                className="w-full object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* Feature 4: Collaboration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card aspect-video flex items-center justify-center">
            <img
              src="/screenshots/team.png"
              alt="Team collaboration with invite links and role management"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Users className="w-3.5 h-3.5" />
              Team Collaboration
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Share with your crew instantly</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Invite your DP, AD, and producer with a single link. Viewers can browse the full plan and leave comments. Admins can edit alongside you in real time.
            </p>
            <ul className="space-y-2.5">
              {[
                "Invite via link — no account required to view",
                "Admin and viewer roles",
                "Email notifications for comments and reactions",
                "Works on mobile for on-set access",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-bg-card border-t border-border">
        <h2 className="text-3xl font-bold text-text-primary mb-4">Ready to plan your next shoot?</h2>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          Free to start. No credit card required. Used by filmmakers planning real productions.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-8 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-lg transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/demo"
            className="px-8 py-3 rounded-lg border border-border text-text-primary hover:bg-bg-card-hover transition-colors text-lg"
          >
            View Live Demo
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-text-muted text-sm">
        ShootPlaner &mdash; Built for filmmakers.
      </footer>
    </div>
    </>
  );
}
