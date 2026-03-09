"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Image as ImageIcon, MapPin, Camera, Layers, Tag, Palette, ArrowUpDown, X, Check, Link2, ExternalLink } from "lucide-react";
import { ShootReference, Location, LocationPhoto } from "@/lib/types";
import ReferenceCard from "./ReferenceCard";
import AddReferenceModal from "./AddReferenceModal";
import PhotoLightbox from "./PhotoLightbox";

interface Props {
  projectId: string;
  canEdit: boolean;
}

type Tab = "moodboard" | "location";

export default function ReferencesView({ projectId, canEdit }: Props) {
  const [references, setReferences] = useState<ShootReference[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationPhotos, setLocationPhotos] = useState<LocationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<Tab>("moodboard");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const locationFilterRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const [refsRes, locsRes, photosRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/references`),
      fetch(`/api/projects/${projectId}/locations`),
      fetch(`/api/projects/${projectId}/location-photos`),
    ]);
    if (refsRes.ok) setReferences(await refsRes.json());
    if (locsRes.ok) setLocations(await locsRes.json());
    if (photosRes.ok) setLocationPhotos(await photosRes.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Collect all unique boards and tags
  const allBoards = useMemo(() => {
    const set = new Set<string>();
    for (const ref of references) {
      if (ref.board) set.add(ref.board);
    }
    return [...set].sort();
  }, [references]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const ref of references) {
      for (const tag of ref.tags || []) set.add(tag);
    }
    return [...set].sort();
  }, [references]);

  // Close location filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locationFilterRef.current && !locationFilterRef.current.contains(e.target as Node)) {
        setLocationFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Locations that have at least one reference assigned
  const assignableLocations = useMemo(() => {
    const locIdsWithRefs = new Set<string>();
    for (const ref of references) {
      for (const id of ref.location_ids || []) locIdsWithRefs.add(id);
    }
    return locations.filter((l) => locIdsWithRefs.has(l.id));
  }, [references, locations]);

  function toggleLocationFilter(locId: string) {
    setLocationFilter((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  }

  // Filter moodboard references
  const filtered = useMemo(() => {
    let result = references.filter((ref) => {
      if (tagFilter !== "all" && !(ref.tags || []).includes(tagFilter)) return false;
      if (boardFilter !== "all") {
        const refBoard = ref.board || "General";
        if (refBoard !== boardFilter) return false;
      }
      if (locationFilter.length > 0) {
        const refLocs = ref.location_ids || [];
        if (!locationFilter.some((id) => refLocs.includes(id))) return false;
      }
      return true;
    });

    // Sort
    if (sortBy === "newest") {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return result;
  }, [references, tagFilter, boardFilter, locationFilter, sortBy]);

  // Group moodboard by board
  const moodboardSections = useMemo(() => {
    const grouped = new Map<string, ShootReference[]>();
    for (const ref of filtered) {
      const board = ref.board || "General";
      if (!grouped.has(board)) grouped.set(board, []);
      grouped.get(board)!.push(ref);
    }

    const result: { name: string; refs: ShootReference[] }[] = [];
    const general = grouped.get("General");
    if (general?.length) result.push({ name: "General", refs: general });
    for (const [name, refs] of grouped) {
      if (name === "General") continue;
      result.push({ name, refs });
    }
    return result;
  }, [filtered]);

  // Group location photos by location — include moodboard images assigned to locations
  const locationSections = useMemo(() => {
    type LocationItem = { id: string; image_url: string; link_url?: string | null; caption: string | null; type: "photo" | "reference" | "link"; created_at: string };

    const itemsByLocation = new Map<string, LocationItem[]>();

    // Add dedicated location photos
    for (const photo of locationPhotos) {
      if (!itemsByLocation.has(photo.location_id)) itemsByLocation.set(photo.location_id, []);
      itemsByLocation.get(photo.location_id)!.push({
        id: `photo-${photo.id}`,
        image_url: photo.image_url,
        caption: photo.caption,
        type: "photo",
        created_at: photo.created_at,
      });
    }

    // Add moodboard references that have location_ids (images and links)
    for (const ref of references) {
      if (!ref.location_ids?.length) continue;
      for (const locId of ref.location_ids) {
        if (!itemsByLocation.has(locId)) itemsByLocation.set(locId, []);
        const existing = itemsByLocation.get(locId)!;
        if (!existing.some((item) => item.id === `ref-${ref.id}`)) {
          existing.push({
            id: `ref-${ref.id}`,
            image_url: ref.image_url,
            link_url: ref.link_url,
            caption: ref.title || ref.notes || null,
            type: ref.link_url ? "link" : "reference",
            created_at: ref.created_at,
          });
        }
      }
    }

    return locations
      .filter((loc) => itemsByLocation.has(loc.id))
      .map((loc) => ({ location: loc, items: itemsByLocation.get(loc.id)! }));
  }, [locationPhotos, locations, references]);

  function detectPlatform(url: string): { label: string; style: string } {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes("tiktok")) return { label: "TikTok", style: "bg-[#010101] text-white" };
      if (host.includes("instagram")) return { label: "Instagram", style: "bg-linear-to-br from-purple-600 to-pink-500 text-white" };
      if (host.includes("youtube") || host.includes("youtu.be")) return { label: "YouTube", style: "bg-red-600 text-white" };
      if (host.includes("vimeo")) return { label: "Vimeo", style: "bg-[#1ab7ea] text-white" };
      if (host.includes("pinterest")) return { label: "Pinterest", style: "bg-[#e60023] text-white" };
      if (host.includes("behance")) return { label: "Behance", style: "bg-[#1769ff] text-white" };
      if (host.includes("dribbble")) return { label: "Dribbble", style: "bg-[#ea4c89] text-white" };
      if (host.includes("twitter") || host.includes("x.com")) return { label: "X", style: "bg-[#000] text-white" };
      if (host.includes("spotify")) return { label: "Spotify", style: "bg-[#1db954] text-white" };
      return { label: host.replace("www.", ""), style: "bg-bg-card-hover text-text-secondary" };
    } catch {
      return { label: "Link", style: "bg-bg-card-hover text-text-secondary" };
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-bg-card border border-border rounded-xl animate-pulse aspect-square" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Tabs + Add button row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setTab("moodboard")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm transition-colors ${
              tab === "moodboard" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Moodboard</span>
            <span className="sm:hidden">Board</span>
            {references.length > 0 && (
              <span className={`text-xs ${tab === "moodboard" ? "text-white/70" : "text-text-muted"}`}>
                {references.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("location")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm transition-colors ${
              tab === "location" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Location Photos</span>
            <span className="sm:hidden">Photos</span>
            {locationSections.length > 0 && (
              <span className={`text-xs ${tab === "location" ? "text-white/70" : "text-text-muted"}`}>
                {locationSections.reduce((sum, s) => sum + s.items.length, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1" />

        {tab === "moodboard" && canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>

      {/* Filters & Sort (moodboard tab only) — separate row */}
      {tab === "moodboard" && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="bg-bg-input border border-border rounded-lg px-2.5 sm:px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {/* Location filter */}
          {assignableLocations.length > 0 && (
            <div ref={locationFilterRef} className="relative">
              <button
                onClick={() => setLocationFilterOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  locationFilter.length > 0
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-bg-input border-border text-text-primary hover:border-border-light"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {locationFilter.length === 0
                    ? "All Locations"
                    : `${locationFilter.length} location${locationFilter.length > 1 ? "s" : ""}`}
                </span>
                <span className="sm:hidden">
                  {locationFilter.length === 0 ? "Locations" : locationFilter.length}
                </span>
                {locationFilter.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocationFilter([]); }}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>
              {locationFilterOpen && (
                <div className="absolute z-20 mt-1 left-0 sm:right-0 sm:left-auto min-w-48 bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    {assignableLocations.map((loc) => {
                      const sel = locationFilter.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          onClick={() => toggleLocationFilter(loc.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                            sel ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-bg-primary"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            sel ? "bg-accent border-accent" : "border-border"
                          }`}>
                            {sel && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${sel ? "text-accent" : "text-text-muted"}`} />
                          <span className="truncate">{loc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {allBoards.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="bg-bg-input border border-border rounded-lg px-2.5 sm:px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">All Boards</option>
                <option value="General">General</option>
                {allBoards.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-bg-input border border-border rounded-lg px-2.5 sm:px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* MOODBOARD TAB */}
      {tab === "moodboard" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No moodboard images yet.</p>
              {canEdit && <p className="text-text-muted text-sm mt-1">Add inspiration images, color palettes, and references.</p>}
            </div>
          ) : (
            <div className="space-y-10">
              {moodboardSections.map((section) => (
                <div key={section.name}>
                  {moodboardSections.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                        {section.name}
                      </h3>
                      <span className="text-xs text-text-muted">({section.refs.length})</span>
                      <div className="flex-1 border-t border-border ml-2" />
                    </div>
                  )}
                  <div className="columns-2 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                    {section.refs.map((ref) => (
                      <ReferenceCard
                        key={ref.id}
                        reference={ref}
                        locations={locations}
                        boards={allBoards}
                        canEdit={canEdit}
                        projectId={projectId}
                        onUpdate={fetchData}
                        onImageClick={(src, alt) => setLightbox({ src, alt })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* LOCATION PHOTOS TAB */}
      {tab === "location" && (
        <>
          {locationSections.length === 0 ? (
            <div className="text-center py-16">
              <Camera className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No location photos yet.</p>
              <p className="text-text-muted text-sm mt-1">Photos uploaded to locations in the itinerary will appear here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {locationSections.map(({ location: loc, items }) => (
                <div key={loc.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-primary">{loc.name}</h3>
                    <span className="text-xs text-text-muted">({items.length})</span>
                    <div className="flex-1 border-t border-border ml-2" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {items.map((item) => (
                      item.type === "link" ? (
                        (() => {
                          const plat = detectPlatform(item.link_url!);
                          return (
                            <a
                              key={item.id}
                              href={item.link_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative bg-bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition-colors group/item"
                            >
                              {item.image_url ? (
                                <div className="relative">
                                  <img src={item.image_url} alt={item.caption || ""} className="w-full aspect-square object-cover" />
                                  <div className="absolute bottom-1.5 left-1.5">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm ${plat.style}`}>
                                      {plat.label}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full aspect-square bg-bg-primary flex flex-col items-center justify-center gap-2">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plat.style}`}>
                                    <span className="text-base font-bold">{plat.label.charAt(0)}</span>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plat.style}`}>
                                    {plat.label}
                                  </span>
                                </div>
                              )}
                              {item.caption && (
                                <div className="px-1.5 py-1 flex items-center gap-1">
                                  <ExternalLink className="w-2.5 h-2.5 text-text-muted shrink-0" />
                                  <p className="text-text-secondary text-[10px] truncate">{item.caption}</p>
                                </div>
                              )}
                            </a>
                          );
                        })()
                      ) : (
                        <div
                          key={item.id}
                          className="relative bg-bg-card border border-border rounded-xl overflow-hidden hover:border-border-light transition-colors cursor-pointer group/item"
                          onClick={() => setLightbox({ src: item.image_url, alt: item.caption || "Location photo" })}
                        >
                          <img
                            src={item.image_url}
                            alt={item.caption || "Location photo"}
                            className="w-full aspect-square object-cover"
                          />
                          {item.type === "reference" && (
                            <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                              <Palette className="w-2.5 h-2.5 text-white" />
                              <span className="text-[9px] text-white font-medium">Moodboard</span>
                            </div>
                          )}
                          {item.caption && (
                            <div className="px-1.5 py-1">
                              <p className="text-text-secondary text-[10px] truncate">{item.caption}</p>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddReferenceModal
          projectId={projectId}
          locations={locations}
          boards={allBoards}
          onCreated={fetchData}
          onClose={() => setShowAdd(false)}
        />
      )}

      {lightbox && (
        <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
