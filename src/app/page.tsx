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

        {/* 1: Itinerary — day-by-day planning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <MapPin className="w-3.5 h-3.5" />
              Itinerary Planner
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Plan every location, day by day</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Structure your entire shoot as a day-by-day location itinerary. Each day gets its own block with all locations listed in order — so your crew always knows exactly where to be and when.
            </p>
            <ul className="space-y-2.5">
              {[
                "Add as many shoot days as you need",
                "Each day shows all locations in sequence",
                "Collapse or expand days to stay focused",
                "Add notes, photos, and comments to every location",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/distance1.png"
              alt="Itinerary view showing shoot days and locations in sequence"
              className="w-full object-cover object-top"
            />
          </div>
        </div>

        {/* 2: Drive time auto-calculation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/distance2.png"
              alt="Auto-calculated drive time and distance between two locations"
              className="w-full object-cover object-top"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Route className="w-3.5 h-3.5" />
              Drive Time Calculator
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Drive times calculated automatically</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              ShootPlaner calculates the real-world drive time and distance between every consecutive location on your itinerary. No more guessing how long it takes to move from one spot to the next.
            </p>
            <ul className="space-y-2.5">
              {[
                "Drive time shown between every location",
                "Distance in miles displayed alongside",
                "Updates automatically when you reorder locations",
                "One-tap to open the full route in Google Maps",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3: View in Maps button */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Route className="w-3.5 h-3.5" />
              Google Maps Integration
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">One tap to open your full route</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              The "View in Google Maps" button at the top of your itinerary instantly opens the entire day's route in Google Maps — with every location already loaded as a stop. Share it with your driver or AD and they can navigate straight away.
            </p>
            <ul className="space-y-2.5">
              {[
                "Appears at the top of the itinerary, always visible",
                "Opens Google Maps with all locations pre-loaded",
                "Works on mobile — tap and go directly from your phone",
                "No manual entry — the route is built from your itinerary",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/viewinmaps.png"
              alt="View in Google Maps button on the itinerary stats bar"
              className="w-full object-cover object-top"
            />
          </div>
        </div>

        {/* 4: Plotted map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/plottedmap.png"
              alt="Google Maps showing the full shoot route plotted with all locations"
              className="w-full object-cover object-top"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Route className="w-3.5 h-3.5" />
              Full Route Planning
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Your entire shoot, plotted on Google Maps</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              See every location from your shoot plotted as a connected route on Google Maps. Know the full scope of your day before you leave — so there are no surprises on location.
            </p>
            <ul className="space-y-2.5">
              {[
                "All locations plotted as waypoints in order",
                "See the full geography of your shoot day at a glance",
                "Google Maps handles live traffic and navigation",
                "Shareable — send the link to anyone on your crew",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 5: Moodboard by location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Camera className="w-3.5 h-3.5" />
              Moodboard
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">References organised by location</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Your moodboard isn&apos;t just a pile of images — every reference can be assigned to a specific location, so your crew knows exactly which shot or place each image belongs to.
            </p>
            <ul className="space-y-2.5">
              {[
                "Filter the moodboard by any location",
                "See only the references relevant to where you're shooting",
                "Keeps visual direction tied to the physical plan",
                "Works with photos, links, and platform embeds",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/moodboardlocations.png"
              alt="Moodboard showing references filtered and grouped by location"
              className="w-full object-cover object-top"
            />
          </div>
        </div>

        {/* 6: Assign to location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/assignlocations.png"
              alt="Assigning a reference image to a specific shoot location"
              className="w-full object-cover object-top"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <MapPin className="w-3.5 h-3.5" />
              Location Tagging
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Tag any reference to a location</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              When adding or editing a reference, assign it to one or more locations from your itinerary. Your DP can pull up exactly the right mood images the moment they arrive on location.
            </p>
            <ul className="space-y-2.5">
              {[
                "Assign a reference to any location in your itinerary",
                "One reference can apply to multiple locations",
                "Tagged images appear in both the moodboard and itinerary",
                "Keeps visual context right where it's needed",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 7: Shot status tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <ListChecks className="w-3.5 h-3.5" />
              Shot Tracking
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Track every shot from planned to complete</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Mark each shot as planned, in progress, or completed as you move through your shoot day. Your whole team sees the same live status — no more checking in over walkie.
            </p>
            <ul className="space-y-2.5">
              {[
                "Three-stage status: planned, in progress, completed",
                "Status updates are visible to the whole team instantly",
                "Colour-coded badges make it easy to scan at a glance",
                "Track progress across all shots in one view",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/shotstatus.png"
              alt="Shot list showing planned, in progress and completed status badges"
              className="w-full object-cover object-top"
            />
          </div>
        </div>

        {/* 8: Shot list with types and references */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card">
            <img
              src="/screenshots/shotlist.png"
              alt="Full shot list with shot types, reference images and location tags"
              className="w-full object-cover object-top"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <ListChecks className="w-3.5 h-3.5" />
              Shot List
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Every shot, fully detailed</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Your shot list is more than a checklist. Each shot carries a title, shot type, reference image, description, and a link to the location it belongs to — everything your crew needs to execute it.
            </p>
            <ul className="space-y-2.5">
              {[
                "Shot types: wide, medium, close-up, aerial, and more",
                "Attach a reference image to show exactly what you're going for",
                "Link each shot to a specific location on the itinerary",
                "Add descriptions and notes for the crew",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 9: Team collaboration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <Users className="w-3.5 h-3.5" />
              Team Collaboration
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-4">Your whole crew, always in sync</h3>
            <p className="text-text-secondary leading-relaxed mb-6">
              Share your project with a single invite link. Your DP, AD, producer, and crew can view the full plan, leave comments, and react to references — from any device, on or off set.
            </p>
            <ul className="space-y-2.5">
              {[
                "Invite anyone with a link — no account needed to view",
                "Admin role lets crew members edit alongside you",
                "Email notifications when someone comments or reacts",
                "Works fully on mobile for quick on-set access",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-bg-card aspect-video bg-linear-to-br from-accent/10 via-bg-card to-bg-primary flex items-center justify-center">
            <div className="text-center px-8">
              <Users className="w-12 h-12 text-accent/40 mx-auto mb-3" />
              <p className="text-text-muted text-sm">Screenshot coming soon</p>
            </div>
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
