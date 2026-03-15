"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Camera, ListChecks, Car, Clock, ExternalLink,
  Link2, Layers, ChevronDown, ChevronUp, ArrowRight, Play,
  CalendarDays, Route, Navigation, MessageSquare,
} from "lucide-react";

interface Location {
  id: string;
  shoot_day_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  drive_time_from_previous: string | null;
  drive_distance_from_previous: string | null;
  position: number;
  notes: string | null;
}

interface ShootDay {
  id: string;
  day_number: number;
  title: string | null;
  date: string | null;
  locations: Location[];
}

interface Reference {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
  board: string | null;
  tags: string[];
  colors: string[];
  notes: string | null;
  location_ids: string[];
}

interface Shot {
  id: string;
  title: string;
  description: string | null;
  shot_type: string | null;
  image_url: string | null;
  status: string;
  location_id: string | null;
  position: number;
}

interface Note {
  id: string;
  location_id: string;
  user_name: string | null;
  content: string;
  created_at: string;
}

interface Reaction {
  id: string;
  reference_id: string;
  user_name: string | null;
  emoji: string;
}

interface Comment {
  id: string;
  reference_id: string;
  user_name: string | null;
  content: string;
  created_at: string;
}

interface Props {
  project: { name: string; cover_image_url: string | null; description: string | null };
  daysWithLocations: ShootDay[];
  locations: Location[];
  references: Reference[];
  shots: Shot[];
  notes: Note[];
  reactions: Reaction[];
  comments: Comment[];
}

type Tab = "itinerary" | "moodboard" | "shots";

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-bg-card-hover text-text-muted",
  in_progress: "bg-accent/15 text-accent",
  completed: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function detectPlatform(url: string): { label: string; style: string } {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok")) return { label: "TikTok", style: "bg-[#010101] text-white" };
    if (host.includes("instagram")) return { label: "Instagram", style: "bg-linear-to-br from-purple-600 to-pink-500 text-white" };
    if (host.includes("youtube") || host.includes("youtu.be")) return { label: "YouTube", style: "bg-red-600 text-white" };
    if (host.includes("pinterest")) return { label: "Pinterest", style: "bg-[#e60023] text-white" };
    if (host.includes("vimeo")) return { label: "Vimeo", style: "bg-[#1ab7ea] text-white" };
    return { label: host.replace("www.", ""), style: "bg-bg-card-hover text-text-secondary" };
  } catch {
    return { label: "Link", style: "bg-bg-card-hover text-text-secondary" };
  }
}

function generateMapsUrl(locs: Location[]): string {
  const valid = locs.filter((l) => l.latitude && l.longitude);
  if (valid.length === 0) return "https://maps.google.com";
  if (valid.length === 1) return `https://www.google.com/maps/search/?api=1&query=${valid[0].latitude},${valid[0].longitude}`;
  const origin = valid[0];
  const dest = valid[valid.length - 1];
  const waypoints = valid.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
  if (waypoints.length > 0) url += `&waypoints=${encodeURIComponent(waypoints.map((w) => `${w.latitude},${w.longitude}`).join("|"))}`;
  url += `&travelmode=driving`;
  return url;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function DemoView({ project, daysWithLocations, locations, references, shots, notes, reactions, comments }: Props) {
  const [tab, setTab] = useState<Tab>("itinerary");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(daysWithLocations.map((d) => d.id)));
  const [expandedLocs, setExpandedLocs] = useState<Set<string>>(new Set());

  function toggleDay(id: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleLoc(id: string) {
    setExpandedLocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const boards = [...new Set(references.map((r) => r.board || "General"))].sort();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-50 bg-bg-card">
        <Link href="/" className="text-xl font-bold text-accent">ShootPlaner</Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full font-medium">
            Demo Project
          </span>
          <Link
            href="/sign-up"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Cover + Header */}
      <div className="relative">
        <div className={`relative ${project.cover_image_url ? "h-52 sm:h-64" : "h-28"} bg-linear-to-br from-accent/10 via-bg-card to-bg-primary`}>
          {project.cover_image_url && (
            <img src={project.cover_image_url} alt={project.name} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{project.name}</h1>
              {project.description && (
                <p className="text-white/70 text-sm mt-1">{project.description}</p>
              )}
              <p className="text-white/50 text-xs mt-1.5">
                {daysWithLocations.length} shoot day{daysWithLocations.length !== 1 ? "s" : ""} · {locations.length} locations · {shots.length} shots · {references.length} references
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo banner */}
      <div className="bg-accent/10 border-b border-accent/20 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-accent">
            <span className="font-semibold">Live demo</span> — This is a real production planned with ShootPlaner. All user names are anonymized.
          </p>
          <Link href="/sign-up" className="shrink-0 text-xs text-accent hover:text-accent-hover font-medium underline underline-offset-2">
            Create your own →
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Tabs */}
        <div className="border-b border-border mt-4">
          <div className="flex gap-1">
            {([
              { id: "itinerary" as Tab, label: "Itinerary", icon: MapPin },
              { id: "moodboard" as Tab, label: "Moodboard", icon: Camera },
              { id: "shots" as Tab, label: "Shot List", icon: ListChecks },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-6">
          {/* ── ITINERARY ── */}
          {tab === "itinerary" && (() => {
            const allLocs = daysWithLocations.flatMap((d) => d.locations);
            const totalTravelMinutes = allLocs.reduce((sum, loc) => {
              const t = loc.drive_time_from_previous;
              if (!t) return sum;
              let mins = 0;
              const hMatch = t.match(/(\d+)\s*hour/);
              const mMatch = t.match(/(\d+)\s*min/);
              if (hMatch) mins += parseInt(hMatch[1]) * 60;
              if (mMatch) mins += parseInt(mMatch[1]);
              return sum + mins;
            }, 0);
            const travelHours = Math.floor(totalTravelMinutes / 60);
            const travelMins = totalTravelMinutes % 60;
            const routeUrl = generateMapsUrl(allLocs);

            return (
              <div>
                {/* Stats Bar */}
                <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-accent" />
                    <span className="text-text-primary font-medium">{daysWithLocations.length}</span>
                    <span className="text-text-secondary">days</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="text-text-primary font-medium">{allLocs.length}</span>
                    <span className="text-text-secondary">locations</span>
                  </div>
                  {totalTravelMinutes > 0 && (
                    <>
                      <div className="w-px h-4 bg-border" />
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-accent" />
                        <span className="text-text-primary font-medium">
                          {travelHours > 0 ? `${travelHours}h ${travelMins}m` : `${travelMins}m`}
                        </span>
                        <span className="text-text-secondary">travel</span>
                      </div>
                    </>
                  )}
                  <div className="flex-1" />
                  {allLocs.length > 0 && (
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 transition-colors"
                    >
                      <Route className="w-4 h-4" />
                      View in Google Maps
                    </a>
                  )}
                </div>

                {/* Days */}
                <div className="space-y-6">
                  {daysWithLocations.map((day) => {
                    const expanded = expandedDays.has(day.id);
                    return (
                      <div key={day.id} className="bg-bg-card border border-border rounded-xl overflow-hidden">
                        {/* Day Header — matches DayColumn */}
                        <div className="bg-bg-card-hover px-5 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-accent/15 flex flex-col items-center justify-center shrink-0">
                              <span className="text-accent font-bold text-lg leading-none">{day.day_number}</span>
                              <span className="text-accent/60 text-[10px] uppercase tracking-wider">Day</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-text-primary text-lg">
                                {day.title || `Day ${day.day_number}`}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                {day.date && (
                                  <span className="text-text-secondary text-sm">
                                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </span>
                                )}
                                <span className="text-text-muted text-sm flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {day.locations.length} {day.locations.length === 1 ? "location" : "locations"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleDay(day.id)}
                            className="text-text-muted hover:text-text-primary transition-colors"
                          >
                            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        {/* Locations */}
                        {expanded && (
                          <div className="p-4 space-y-0">
                            {day.locations.map((loc, idx) => {
                              const locNotes = notes.filter((n) => n.location_id === loc.id);
                              const locExpanded = expandedLocs.has(loc.id);
                              const mapsUrl = loc.latitude && loc.longitude
                                ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
                                : loc.address
                                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`
                                : null;

                              return (
                                <div key={loc.id}>
                                  {/* Drive connector */}
                                  {idx > 0 && (
                                    <div className="flex items-center gap-3 py-2.5 px-3 my-1 rounded-lg bg-bg-primary text-xs text-text-muted">
                                      <Car className="w-3.5 h-3.5 shrink-0 text-accent" />
                                      {loc.drive_time_from_previous ? (
                                        <>
                                          <span className="font-medium text-text-secondary">{loc.drive_time_from_previous}</span>
                                          {loc.drive_distance_from_previous && (
                                            <span className="text-text-muted/70">· {loc.drive_distance_from_previous}</span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-text-muted/60 italic">Drive time not calculated</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Location Card — matches LocationCard */}
                                  <div className="bg-bg-card-hover border border-border rounded-xl overflow-hidden">
                                    {/* Hero image with gradient overlay */}
                                    {loc.photo_url ? (
                                      <div className="relative">
                                        <img
                                          src={loc.photo_url}
                                          alt={loc.name}
                                          className="w-full object-cover max-h-72"
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                          <h4 className="font-semibold text-white text-lg">{loc.name}</h4>
                                          {loc.address && (
                                            <div className="flex items-center gap-1.5 mt-1 text-white/70 text-sm">
                                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                                              <span className="truncate">{loc.address}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* No-image header */
                                      <div className="flex items-center gap-3 p-4">
                                        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                                          <MapPin className="w-5 h-5 text-accent" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-text-primary">{loc.name}</h4>
                                          {loc.address && (
                                            <p className="text-text-secondary text-sm truncate mt-0.5">{loc.address}</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Actions bar (matches LocationCard toggle bar) */}
                                    <div className="flex items-center justify-between px-4 py-2">
                                      <div className="flex items-center gap-3">
                                        {mapsUrl && (
                                          <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                                          >
                                            <Navigation className="w-3.5 h-3.5" />
                                            Directions
                                          </a>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleLoc(loc.id)}
                                        className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-xs"
                                      >
                                        {locExpanded ? "Less" : "More"}
                                        {locExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>

                                    {/* Expanded details */}
                                    {locExpanded && (
                                      <div className="border-t border-border p-4 space-y-3">
                                        {loc.description && (
                                          <p className="text-text-secondary text-sm leading-relaxed">{loc.description}</p>
                                        )}
                                        {loc.notes && (
                                          <div className="bg-bg-primary rounded-lg p-3 border border-border">
                                            <p className="text-text-secondary text-sm leading-relaxed">{loc.notes}</p>
                                          </div>
                                        )}
                                        {/* Notes/Comments */}
                                        {locNotes.length > 0 && (
                                          <div className="pt-1 border-t border-border">
                                            <button
                                              onClick={() => {/* already expanded via locExpanded */}}
                                              className="flex items-center gap-2 text-sm text-text-secondary mb-2"
                                            >
                                              <MessageSquare className="w-4 h-4" />
                                              Comments ({locNotes.length})
                                            </button>
                                            <div className="space-y-2">
                                              {locNotes.map((note) => (
                                                <div key={note.id} className="flex gap-2">
                                                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[10px] text-accent font-bold">
                                                      {(note.user_name || "?")[0].toUpperCase()}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-xs font-medium text-text-secondary">{note.user_name}</span>
                                                    <span className="text-xs text-text-muted ml-1.5">{timeAgo(note.created_at)}</span>
                                                    <p className="text-text-secondary text-sm mt-0.5">{note.content}</p>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {day.locations.length === 0 && (
                              <div className="py-10 text-center text-text-muted text-sm border border-dashed border-border rounded-lg">
                                No locations for this day.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── MOODBOARD ── */}
          {tab === "moodboard" && (
            <div className="space-y-10">
              {boards.map((board) => {
                const boardRefs = references.filter((r) => (r.board || "General") === board);
                if (boardRefs.length === 0) return null;
                return (
                  <div key={board}>
                    {boards.length > 1 && (
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{board}</h3>
                        <span className="text-xs text-text-muted">({boardRefs.length})</span>
                        <div className="flex-1 border-t border-border ml-2" />
                      </div>
                    )}
                    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                      {boardRefs.map((ref) => {
                        const refComments = comments.filter((c) => c.reference_id === ref.id);
                        const refReactions = reactions.filter((r) => r.reference_id === ref.id);
                        const isLink = !!ref.link_url;
                        const hasImage = !!ref.image_url;
                        const plat = isLink ? detectPlatform(ref.link_url!) : null;

                        return (
                          <div
                            key={ref.id}
                            className="break-inside-avoid bg-bg-card border border-border rounded-xl overflow-hidden"
                          >
                            {hasImage ? (
                              <div className="relative">
                                {isLink ? (
                                  <a href={ref.link_url!} target="_blank" rel="noopener noreferrer">
                                    <img src={ref.image_url} alt={ref.title || ""} className="w-full object-cover" />
                                  </a>
                                ) : (
                                  <img src={ref.image_url} alt={ref.title || ""} className="w-full object-cover" />
                                )}
                                {isLink && plat && (
                                  <div className="absolute bottom-2 left-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-md ${plat.style}`}>
                                      {plat.label}
                                    </span>
                                  </div>
                                )}
                                {ref.colors && ref.colors.length > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
                                    {ref.colors.map((c) => (
                                      <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : isLink && plat ? (
                              <a
                                href={ref.link_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-6 bg-bg-primary hover:bg-bg-card-hover transition-colors"
                              >
                                <div className="flex flex-col items-center gap-3 text-center">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${plat.style}`}>
                                    <span className="text-xl font-bold">{plat.label.charAt(0)}</span>
                                  </div>
                                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${plat.style}`}>{plat.label}</span>
                                  <span className="text-xs text-accent flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> Open link
                                  </span>
                                </div>
                              </a>
                            ) : null}

                            {/* Card footer */}
                            {(ref.title || ref.notes || ref.tags?.length > 0 || refReactions.length > 0 || refComments.length > 0) && (
                              <div className="p-3 space-y-2">
                                {ref.title && <p className="text-sm font-medium text-text-primary">{ref.title}</p>}
                                {ref.notes && <p className="text-xs text-text-muted line-clamp-2">{ref.notes}</p>}
                                {ref.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {ref.tags.slice(0, 4).map((tag) => (
                                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* Reactions */}
                                {refReactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(
                                      refReactions.reduce((acc: Record<string, number>, r) => {
                                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                        return acc;
                                      }, {})
                                    ).map(([emoji, count]) => (
                                      <span key={emoji} className="text-xs bg-bg-primary border border-border rounded-full px-2 py-0.5 flex items-center gap-1">
                                        {emoji} <span className="text-text-muted">{count}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {/* Comments */}
                                {refComments.length > 0 && (
                                  <div className="space-y-1.5 pt-1 border-t border-border">
                                    {refComments.slice(0, 2).map((c) => (
                                      <div key={c.id} className="flex gap-1.5 text-xs">
                                        <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                                          <span className="text-[8px] text-accent font-bold">
                                            {(c.user_name || "?")[0].toUpperCase()}
                                          </span>
                                        </div>
                                        <p className="text-text-secondary">
                                          <span className="font-medium text-text-primary">{c.user_name}</span>{" "}
                                          {c.content}
                                        </p>
                                      </div>
                                    ))}
                                    {refComments.length > 2 && (
                                      <p className="text-[10px] text-text-muted pl-5.5">+{refComments.length - 2} more</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {references.length === 0 && (
                <div className="text-center py-16 text-text-muted">No moodboard items.</div>
              )}
            </div>
          )}

          {/* ── SHOT LIST ── */}
          {tab === "shots" && (
            <div className="space-y-3">
              {shots.map((shot) => {
                const loc = locations.find((l) => l.id === shot.location_id);
                return (
                  <div key={shot.id} className="bg-bg-card border border-border rounded-xl overflow-hidden flex gap-0">
                    {shot.image_url && (
                      <div className="w-20 sm:w-28 shrink-0">
                        <img src={shot.image_url} alt={shot.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-text-primary truncate">{shot.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[shot.status] || STATUS_STYLES.planned}`}>
                              {STATUS_LABELS[shot.status] || shot.status}
                            </span>
                            {shot.shot_type && (
                              <span className="text-[10px] text-text-muted border border-border rounded-full px-2 py-0.5">
                                {shot.shot_type}
                              </span>
                            )}
                            {loc && (
                              <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {loc.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {shot.description && (
                        <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{shot.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {shots.length === 0 && (
                <div className="text-center py-16 text-text-muted">No shots yet.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="border-t border-border mt-8 py-16 px-6 text-center bg-bg-card">
        <h2 className="text-2xl font-bold text-text-primary mb-3">Plan your next shoot like this</h2>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Create your own project, invite your crew, and plan every detail — for free.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-lg transition-colors text-lg"
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-text-muted text-sm mt-3">No credit card required</p>
      </div>
    </div>
  );
}
