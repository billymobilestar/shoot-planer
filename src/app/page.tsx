import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MapPin, Camera, ListChecks, Users } from "lucide-react";
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
    </>
  );
}
