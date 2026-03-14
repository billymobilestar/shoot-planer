"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, MapPin, X, Check, Plus, StickyNote, ChevronDown, Link2, ExternalLink } from "lucide-react";
import { ShootReference, Location } from "@/lib/types";
import ReferenceInteractions from "./ReferenceInteractions";

const SUGGESTED_TAGS = [
  "Lighting", "Color Palette", "Wardrobe", "Set Design",
  "Hair & Makeup", "Props", "Composition", "Mood", "Texture",
];

interface Props {
  reference: ShootReference;
  locations: Location[];
  boards: string[];
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  onImageClick: (src: string, alt: string) => void;
}

export default function ReferenceCard({ reference, locations, boards, canEdit, projectId, onUpdate, onImageClick }: Props) {
  const [editing, setEditing] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [quickLocationOpen, setQuickLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const quickLocationRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: reference.title || "",
    notes: reference.notes || "",
    location_ids: reference.location_ids || [],
    board: reference.board || "",
    newBoard: "",
    tags: reference.tags || [],
    tagInput: "",
  });

  const assignedLocations = locations.filter((l) => (reference.location_ids || []).includes(l.id));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
      if (quickLocationRef.current && !quickLocationRef.current.contains(e.target as Node)) {
        setQuickLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleFormLocation(id: string) {
    setForm((f) => ({
      ...f,
      location_ids: f.location_ids.includes(id)
        ? f.location_ids.filter((l) => l !== id)
        : [...f.location_ids, id],
    }));
  }

  async function quickToggleLocation(locId: string) {
    const currentIds = reference.location_ids || [];
    const newIds = currentIds.includes(locId)
      ? currentIds.filter((id) => id !== locId)
      : [...currentIds, locId];
    await fetch(`/api/projects/${projectId}/references/${reference.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_ids: newIds }),
    });
    onUpdate();
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    else setForm((f) => ({ ...f, tagInput: "" }));
  }

  async function save() {
    const finalBoard = form.newBoard.trim() || form.board || null;
    await fetch(`/api/projects/${projectId}/references/${reference.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title || null,
        notes: form.notes || null,
        location_ids: form.location_ids,
        board: finalBoard,
        tags: form.tags,
      }),
    });
    setEditing(false);
    onUpdate();
  }

  async function deleteRef() {
    await fetch(`/api/projects/${projectId}/references/${reference.id}`, { method: "DELETE" });
    onUpdate();
  }

  const isLink = !!reference.link_url;
  const hasImage = !!reference.image_url;

  let linkHostname = "";
  let linkPlatform = "";
  let platformLabel = "";
  let platformStyle = "bg-bg-card-hover text-text-secondary";
  if (isLink) {
    try {
      const host = new URL(reference.link_url!).hostname.toLowerCase();
      linkHostname = host;
      if (host.includes("tiktok")) { linkPlatform = "tiktok"; platformLabel = "TikTok"; platformStyle = "bg-[#010101] text-white"; }
      else if (host.includes("instagram")) { linkPlatform = "instagram"; platformLabel = "Instagram"; platformStyle = "bg-linear-to-br from-purple-600 to-pink-500 text-white"; }
      else if (host.includes("youtube") || host.includes("youtu.be")) { linkPlatform = "youtube"; platformLabel = "YouTube"; platformStyle = "bg-red-600 text-white"; }
      else if (host.includes("vimeo")) { linkPlatform = "vimeo"; platformLabel = "Vimeo"; platformStyle = "bg-[#1ab7ea] text-white"; }
      else if (host.includes("pinterest")) { linkPlatform = "pinterest"; platformLabel = "Pinterest"; platformStyle = "bg-[#e60023] text-white"; }
      else if (host.includes("behance")) { linkPlatform = "behance"; platformLabel = "Behance"; platformStyle = "bg-[#1769ff] text-white"; }
      else if (host.includes("dribbble")) { linkPlatform = "dribbble"; platformLabel = "Dribbble"; platformStyle = "bg-[#ea4c89] text-white"; }
      else if (host.includes("twitter") || host.includes("x.com")) { linkPlatform = "x"; platformLabel = "X"; platformStyle = "bg-[#000] text-white"; }
      else if (host.includes("spotify")) { linkPlatform = "spotify"; platformLabel = "Spotify"; platformStyle = "bg-[#1db954] text-white"; }
      else { linkPlatform = "other"; platformLabel = host.replace("www.", ""); platformStyle = "bg-bg-card-hover text-text-secondary"; }
    } catch {}
  }

  return (
    <div data-id={reference.id} className="bg-bg-card border border-border rounded-xl overflow-hidden break-inside-avoid hover:border-border-light transition-all group">
      {/* Image or Link hero */}
      {hasImage ? (
        <div className="relative">
          <img
            src={reference.image_url}
            alt={reference.title || "Reference"}
            className="w-full object-contain cursor-pointer"
            onClick={() => isLink ? window.open(reference.link_url!, "_blank") : onImageClick(reference.image_url, reference.title || "Reference")}
          />
          {isLink && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className={`text-sm font-bold px-3.5 py-1.5 rounded-full shadow-md ring-1 ring-white/20 ${platformStyle}`}>
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {platformLabel}
                </span>
              </span>
            </div>
          )}
          {canEdit && !editing && (
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="bg-black/60 rounded-full p-2 sm:p-1.5 text-white hover:bg-black/80 active:bg-black/80">
                <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
              <button onClick={deleteRef} className="bg-black/60 rounded-full p-2 sm:p-1.5 text-white hover:bg-red-600 active:bg-red-600">
                <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
        </div>
      ) : isLink ? (
        <div className="relative">
          <a
            href={reference.link_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 bg-bg-primary hover:bg-bg-card-hover transition-colors"
          >
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${platformStyle}`}>
                <span className="text-2xl font-bold">{platformLabel.charAt(0).toUpperCase()}</span>
              </div>
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full shadow-md ${platformStyle}`}>
                {platformLabel}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-accent font-medium mt-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Open link
              </div>
            </div>
          </a>
          {canEdit && !editing && (
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="bg-black/60 rounded-full p-2 sm:p-1.5 text-white hover:bg-black/80 active:bg-black/80">
                <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
              <button onClick={deleteRef} className="bg-black/60 rounded-full p-2 sm:p-1.5 text-white hover:bg-red-600 active:bg-red-600">
                <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Color palette bar */}
      {reference.colors?.length > 0 && (
        <div className="flex h-2">
          {reference.colors.map((color) => (
            <div key={color} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      )}

      <div className="p-3">
        {editing ? (
          <div className="space-y-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes / annotations"
              rows={2}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
            />

            {/* Board */}
            <div className="flex gap-2">
              <select
                value={form.board}
                onChange={(e) => setForm((f) => ({ ...f, board: e.target.value, newBoard: "" }))}
                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">General</option>
                {boards.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input
                value={form.newBoard}
                onChange={(e) => setForm((f) => ({ ...f, newBoard: e.target.value, board: "" }))}
                placeholder="New board..."
                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 bg-accent-muted text-accent text-[10px] px-1.5 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={form.tagInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(form.tagInput); } }}
                  placeholder="Add tag..."
                  className="flex-1 bg-bg-input border border-border rounded-lg px-2 py-1 text-text-primary text-xs focus:outline-none focus:border-accent"
                />
                <button type="button" onClick={() => addTag(form.tagInput)} className="text-accent"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t)).slice(0, 5).map((tag) => (
                  <button key={tag} type="button" onClick={() => addTag(tag)} className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-text-muted hover:text-text-primary transition-colors">
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations (multi-select) */}
            <div ref={locationRef} className="relative">
              <button
                type="button"
                onClick={() => setLocationDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-1.5 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-left focus:outline-none focus:border-accent"
              >
                <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                <span className={form.location_ids.length ? "text-text-primary truncate" : "text-text-muted"}>
                  {form.location_ids.length
                    ? form.location_ids.map((id) => locations.find((l) => l.id === id)?.name).filter(Boolean).join(", ")
                    : "Assign locations..."}
                </span>
                <ChevronDown className="w-3 h-3 text-text-muted ml-auto shrink-0" />
              </button>
              {locationDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg max-h-36 overflow-y-auto">
                  {locations.map((loc) => {
                    const sel = form.location_ids.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleFormLocation(loc.id)}
                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left hover:bg-bg-primary transition-colors ${sel ? "text-accent" : "text-text-primary"}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-accent border-accent" : "border-border"}`}>
                          {sel && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={save} className="text-success hover:text-green-400"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <>
            {reference.title && <h4 className="font-medium text-text-primary text-sm mb-1">{reference.title}</h4>}

            {/* Tags */}
            {reference.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {reference.tags.map((tag) => (
                  <span key={tag} className="bg-accent-muted text-accent text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {reference.notes && (
              <div className="flex items-start gap-1.5 mb-2 bg-bg-primary rounded-lg p-2 border border-border">
                <StickyNote className="w-3 h-3 text-text-muted mt-0.5 shrink-0" />
                <p className="text-text-secondary text-xs leading-relaxed">{reference.notes}</p>
              </div>
            )}

            {/* Description (legacy) */}
            {reference.description && !reference.notes && (
              <p className="text-text-secondary text-xs mb-2">{reference.description}</p>
            )}

            {/* Location assigner */}
            <div ref={quickLocationRef} className="relative mb-2">
              {/* Assigned location pills */}
              {assignedLocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assignedLocations.map((loc) => (
                    <span key={loc.id} className="inline-flex items-center gap-1 text-xs text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg font-medium">
                      <MapPin className="w-3 h-3" />
                      {loc.name}
                      {canEdit && (
                        <button onClick={() => quickToggleLocation(loc.id)} className="hover:text-red-400 ml-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Add location button — full width, always visible for editors */}
              {canEdit && (
                <button
                  onClick={() => setQuickLocationOpen((v) => !v)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    quickLocationOpen
                      ? "bg-accent/10 border border-accent/30 text-accent"
                      : assignedLocations.length === 0
                        ? "bg-bg-primary border border-dashed border-border text-text-muted hover:text-accent hover:border-accent hover:bg-accent/5"
                        : "bg-bg-primary border border-dashed border-accent/20 text-accent/70 hover:text-accent hover:border-accent/40 hover:bg-accent/5"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {assignedLocations.length === 0 ? "Assign to location" : "Add another location"}
                  <ChevronDown className={`w-3 h-3 transition-transform ${quickLocationOpen ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* Dropdown */}
              {quickLocationOpen && (
                <div className="mt-1.5 w-full bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {locations.length === 0 ? (
                    <p className="text-text-muted text-xs text-center py-3">No locations in this project yet</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {locations.map((loc) => {
                        const sel = (reference.location_ids || []).includes(loc.id);
                        return (
                          <button
                            key={loc.id}
                            onClick={() => quickToggleLocation(loc.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                              sel
                                ? "bg-accent/10 text-accent"
                                : "text-text-primary hover:bg-bg-primary"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              sel ? "bg-accent border-accent" : "border-border"
                            }`}>
                              {sel && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${sel ? "text-accent" : "text-text-muted"}`} />
                            <span className="text-sm truncate">{loc.name}</span>
                            {loc.address && (
                              <span className="text-[10px] text-text-muted ml-auto truncate max-w-20 shrink-0">{loc.address}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Show location pills for viewers too */}
            {!canEdit && assignedLocations.length === 0 && (
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-2">
                <MapPin className="w-3 h-3" />
                No location assigned
              </div>
            )}

            {/* Reactions & Comments */}
            <ReferenceInteractions projectId={projectId} referenceId={reference.id} />
          </>
        )}
      </div>
    </div>
  );
}
