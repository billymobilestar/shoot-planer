"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, Trash2, Upload, MapPin, MessageSquare, Navigation, FilmIcon, Clock, Coffee, Pencil, ImageIcon, StickyNote, Link2, CheckCircle2, Circle } from "lucide-react";
import { Location } from "@/lib/types";
import LocationNotes from "./LocationNotes";
import LocationGallery from "./LocationGallery";
import LocationLinks from "./LocationLinks";
import SceneModal from "./SceneModal";

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function friendlyDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  return parts.join(" ") || "0 minutes";
}

interface Props {
  location: Location;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  onRequestDelete?: () => void;
  isDragOverlay?: boolean;
}

function TimingInput({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
}) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" min="0" value={h || ""} placeholder="0"
          onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + m)}
          onBlur={onBlur}
          className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
        />
        <span className="text-text-muted text-[10px]">h</span>
        <input
          type="number" min="0" max="59" value={m || ""} placeholder="0"
          onChange={(e) => onChange(h * 60 + Math.min(59, parseInt(e.target.value) || 0))}
          onBlur={onBlur}
          className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
        />
        <span className="text-text-muted text-[10px]">m</span>
      </div>
    </div>
  );
}

export default function LocationCard({ location, canEdit, projectId, onUpdate, onRequestDelete, isDragOverlay }: Props) {
  const [expanded, setExpanded] = useState(!canEdit);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: location.name,
    description: location.description || "",
    address: location.address || "",
    latitude: location.latitude?.toString() || "",
    longitude: location.longitude?.toString() || "",
    notes: location.notes || "",
  });
  const [timing, setTiming] = useState({
    prep: location.prep_minutes || 0,
    shoot: location.shoot_minutes || 0,
    wrap: location.wrap_minutes || 0,
    breakAfter: location.break_after_minutes || 0,
  });
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNotes, setShowNotes] = useState(!canEdit);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showScene, setShowScene] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [completed, setCompleted] = useState(location.completed || false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: location.id, disabled: !canEdit });

  const style = isDragOverlay ? {} : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  const scenes = location.scenes || [];
  const sceneCount = scenes.length;
  const totalSceneDuration = scenes.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalSceneMins = timing.prep + (totalSceneDuration || timing.shoot) + timing.wrap;
  const hasTiming = totalSceneMins > 0;

  // Fetch gallery photo and link counts
  useEffect(() => {
    if (isDragOverlay) return;
    fetch(`/api/projects/${projectId}/locations/${location.id}/photos`).then(r => r.ok ? r.json() : []).then(d => setPhotoCount(d.length ?? 0));
    fetch(`/api/projects/${projectId}/locations/${location.id}/links`).then(r => r.ok ? r.json() : []).then(d => setLinkCount(d.length ?? 0));
  }, [projectId, location.id, isDragOverlay]);

  const badges: { icon: typeof ImageIcon; label: string; count: number }[] = [
    { icon: ImageIcon, label: "Photos", count: photoCount + (location.photo_url ? 1 : 0) },
    { icon: FilmIcon, label: "Scenes", count: sceneCount },
    { icon: Link2, label: "Links", count: linkCount },
    { icon: StickyNote, label: "Notes", count: location.notes ? 1 : 0 },
  ];

  async function saveTiming(t: typeof timing) {
    await fetch(`/api/projects/${projectId}/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prep_minutes: t.prep,
        shoot_minutes: t.shoot,
        wrap_minutes: t.wrap,
        break_after_minutes: t.breakAfter,
      }),
    });
    onUpdate();
  }

  function updateTiming(field: keyof typeof timing, value: number) {
    setTiming((t) => ({ ...t, [field]: value }));
  }

  function blurTiming() {
    saveTiming(timing);
  }

  async function saveEdit() {
    await fetch(`/api/projects/${projectId}/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        notes: form.notes || null,
      }),
    });
    setEditing(false);
    onUpdate();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      await fetch(`/api/projects/${projectId}/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: url }),
      });
      onUpdate();
    }
    setUploading(false);
  }

  async function deleteLocation() {
    await fetch(`/api/projects/${projectId}/locations/${location.id}`, { method: "DELETE" });
    onUpdate();
  }

  async function toggleCompleted() {
    const next = !completed;
    setCompleted(next);
    await fetch(`/api/projects/${projectId}/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    onUpdate();
  }

  const mapsUrl = location.latitude && location.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
    : null;

  return (
    <>
    <div ref={setNodeRef} style={style} data-id={location.id} className={`bg-bg-card-hover border rounded-xl overflow-hidden transition-all ${completed ? "border-success/40" : "border-border"}`}>

      {/* Hero image */}
      {location.photo_url && (
        <div className="relative">
          <img src={location.photo_url} alt={location.name} className="w-full object-cover max-h-72" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          {/* Completion toggle */}
          <button
            onClick={toggleCompleted}
            className="absolute top-3 left-3 z-10 transition-transform hover:scale-110 active:scale-95"
            title={completed ? "Mark incomplete" : "Mark complete"}
          >
            {completed ? (
              <CheckCircle2 className="w-7 h-7 text-success drop-shadow-lg" />
            ) : (
              <Circle className="w-7 h-7 text-white/50 hover:text-white/80 drop-shadow-lg" />
            )}
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2">
              {canEdit && (
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/70 hover:text-white">
                  <GripVertical className="w-4 h-4" />
                </button>
              )}
              <h4 className={`font-semibold text-white text-lg ${completed ? "line-through opacity-70" : ""}`}>{location.name}</h4>
              {/* Inline badges next to name */}
              <div className="flex items-center gap-1.5 ml-1">
                {badges.filter(b => b.count > 0).map(({ icon: Icon, label, count }) => (
                  <span key={label} className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/25 backdrop-blur-sm rounded-full px-2 py-0.5 font-medium">
                    <Icon className="w-3 h-3" />{count}
                  </span>
                ))}
              </div>
            </div>
            {location.address && (
              <div className="flex items-center gap-1.5 mt-1 text-white/70 text-sm">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{location.address}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {hasTiming ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <Clock className="w-3.5 h-3.5" />{fmtMins(totalSceneMins)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-200 bg-amber-500/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <Clock className="w-3.5 h-3.5" />No duration set
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header without image */}
      {!location.photo_url && (
        <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          {/* Completion toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleCompleted(); }}
            className="shrink-0 transition-transform hover:scale-110 active:scale-95"
            title={completed ? "Mark incomplete" : "Mark complete"}
          >
            {completed ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : (
              <Circle className="w-6 h-6 text-text-muted hover:text-text-secondary" />
            )}
          </button>
          {canEdit && (
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${completed ? "bg-success/10" : "bg-accent-muted"}`}>
            <MapPin className={`w-5 h-5 ${completed ? "text-success" : "text-accent"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold truncate ${completed ? "text-text-muted line-through" : "text-text-primary"}`}>{location.name}</h4>
              {/* Inline badges next to name */}
              {badges.filter(b => b.count > 0).map(({ icon: Icon, label, count }) => (
                <span key={label} className="inline-flex items-center gap-1 text-xs text-text-secondary bg-bg-card border border-border rounded-full px-2 py-0.5 font-medium shrink-0">
                  <Icon className="w-3 h-3 text-accent/70" />{count}
                </span>
              ))}
            </div>
            {location.address && <p className="text-text-secondary text-sm truncate mt-0.5">{location.address}</p>}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {hasTiming ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 rounded-full px-2.5 py-1">
                  <Clock className="w-3.5 h-3.5" />{fmtMins(totalSceneMins)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-warning/80 bg-warning/10 rounded-full px-2.5 py-1">
                  <Clock className="w-3.5 h-3.5" />No duration set
                </span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
        </div>
      )}

      {/* Toggle bar for image cards */}
      {location.photo_url && (
        <div className="flex items-center justify-between px-4 py-2 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Navigation className="w-3.5 h-3.5" />Directions
              </a>
            )}
          </div>
          <span className="text-text-muted flex items-center gap-1 text-xs">
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">

          {/* ── Duration banner (prominent, at top) ── */}
          {hasTiming && !showTimingEditor && (
            <div
              className="rounded-xl bg-accent/5 border border-accent/20 p-4 cursor-pointer group"
              onClick={() => canEdit && setShowTimingEditor(true)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Shoot Duration</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{friendlyDuration(totalSceneMins)}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-text-muted">
                    {timing.prep > 0 && <span>Prep <strong className="text-text-secondary">{fmtMins(timing.prep)}</strong></span>}
                    {sceneCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <FilmIcon className="w-3 h-3" />
                        {sceneCount} {sceneCount === 1 ? "scene" : "scenes"} <strong className="text-text-secondary">{fmtMins(totalSceneDuration)}</strong>
                      </span>
                    ) : (
                      timing.shoot > 0 && <span>Shoot <strong className="text-text-secondary">{fmtMins(timing.shoot)}</strong></span>
                    )}
                    {timing.wrap > 0 && <span>Wrap <strong className="text-text-secondary">{fmtMins(timing.wrap)}</strong></span>}
                    {timing.breakAfter > 0 && (
                      <span className="flex items-center gap-1"><Coffee className="w-3 h-3" />Break <strong className="text-text-secondary">{fmtMins(timing.breakAfter)}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Clock className="w-8 h-8 text-accent/20" />
                  {canEdit && (
                    <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <Pencil className="w-2.5 h-2.5" />Edit
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Timing editor (toggled) ── */}
          {showTimingEditor && canEdit && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />Shoot Duration
                </p>
                <button
                  onClick={() => setShowTimingEditor(false)}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                >Done</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <TimingInput label="Prep" value={timing.prep} onChange={(v) => updateTiming("prep", v)} onBlur={blurTiming} />
                <TimingInput label="Shoot" value={timing.shoot} onChange={(v) => updateTiming("shoot", v)} onBlur={blurTiming} />
                <TimingInput label="Wrap" value={timing.wrap} onChange={(v) => updateTiming("wrap", v)} onBlur={blurTiming} />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-accent/10">
                <Coffee className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span className="text-xs text-text-muted shrink-0">Break after</span>
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min="0" value={Math.floor(timing.breakAfter / 60) || ""} placeholder="0"
                    onChange={(e) => updateTiming("breakAfter", (parseInt(e.target.value) || 0) * 60 + (timing.breakAfter % 60))}
                    onBlur={blurTiming}
                    className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
                  />
                  <span className="text-text-muted text-[10px]">h</span>
                  <input type="number" min="0" max="59" value={timing.breakAfter % 60 || ""} placeholder="0"
                    onChange={(e) => updateTiming("breakAfter", Math.floor(timing.breakAfter / 60) * 60 + Math.min(59, parseInt(e.target.value) || 0))}
                    onBlur={blurTiming}
                    className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
                  />
                  <span className="text-text-muted text-[10px]">m</span>
                </div>
              </div>
              {totalSceneMins > 0 && (
                <p className="text-sm font-semibold text-accent pt-1">Total: {friendlyDuration(totalSceneMins)}</p>
              )}
            </div>
          )}

          {/* Viewer-only timing display */}
          {!canEdit && hasTiming && (
            <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Shoot Duration</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{friendlyDuration(totalSceneMins)}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-text-muted">
                {timing.prep > 0 && <span>Prep <strong className="text-text-secondary">{fmtMins(timing.prep)}</strong></span>}
                {sceneCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <FilmIcon className="w-3 h-3" />
                    {sceneCount} {sceneCount === 1 ? "scene" : "scenes"} <strong className="text-text-secondary">{fmtMins(totalSceneDuration)}</strong>
                  </span>
                ) : (
                  timing.shoot > 0 && <span>Shoot <strong className="text-text-secondary">{fmtMins(timing.shoot)}</strong></span>
                )}
                {timing.wrap > 0 && <span>Wrap <strong className="text-text-secondary">{fmtMins(timing.wrap)}</strong></span>}
                {timing.breakAfter > 0 && (
                  <span className="flex items-center gap-1"><Coffee className="w-3 h-3" />Break <strong className="text-text-secondary">{fmtMins(timing.breakAfter)}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {location.description && !editing && (
            <p className="text-text-secondary text-sm leading-relaxed">{location.description}</p>
          )}

          {/* Location meta */}
          {!editing && (
            <div className="space-y-2">
              {!location.photo_url && location.address && mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />View on Google Maps
                </a>
              )}
              {location.latitude && location.longitude && (
                <p className="text-text-muted text-xs">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
              )}
              {location.notes && (
                <div className="bg-bg-primary rounded-lg p-3 border border-border">
                  <p className="text-text-secondary text-sm leading-relaxed">{location.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Edit actions */}
          {canEdit && !editing && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Add Shoot Duration — prominent when not set */}
              {!hasTiming && !showTimingEditor && (
                <button
                  onClick={() => setShowTimingEditor(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Add Shoot Duration
                </button>
              )}
              <button onClick={() => setEditing(true)} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Edit Details
              </button>
              <label className="text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              <button
                onClick={() => setShowScene(true)}
                className={`text-sm flex items-center gap-1 transition-colors ${sceneCount > 0 ? "text-accent hover:text-accent-hover font-medium" : "text-text-secondary hover:text-text-primary"}`}
              >
                <FilmIcon className="w-3.5 h-3.5" />
                {sceneCount > 0 ? `Scenes (${sceneCount})` : "Add Scene"}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2 text-sm ml-auto">
                  <span className="text-text-secondary">Delete?</span>
                  <button onClick={onRequestDelete ?? deleteLocation} className="text-danger hover:text-danger-hover font-medium">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-text-secondary">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-sm text-danger hover:text-danger-hover transition-colors ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Location name"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description" rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  placeholder="Latitude" type="number" step="any"
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
                <input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  placeholder="Longitude" type="number" step="any"
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes" rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">Save</button>
                <button onClick={() => setEditing(false)} className="bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2 text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          <LocationGallery projectId={projectId} locationId={location.id} canEdit={canEdit} />

          {/* Links & References */}
          <LocationLinks projectId={projectId} locationId={location.id} canEdit={canEdit} />

          {/* Scene button for viewers */}
          {!canEdit && sceneCount > 0 && (
            <button onClick={() => setShowScene(true)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors">
              <FilmIcon className="w-3.5 h-3.5" />View Scenes ({sceneCount})
            </button>
          )}

          {/* Comments (viewers) */}
          {!canEdit && (
            <div className="pt-2 border-t border-border">
              <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                <MessageSquare className="w-4 h-4" />Comments
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showNotes && <div className="mt-3"><LocationNotes projectId={projectId} locationId={location.id} /></div>}
            </div>
          )}
        </div>
      )}

      {/* Comments — always accessible for editors */}
      {canEdit && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-1">
            <MessageSquare className="w-4 h-4" />Comments
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showNotes && <div className="mt-3"><LocationNotes projectId={projectId} locationId={location.id} /></div>}
        </div>
      )}
    </div>

    {showScene && (
      <SceneModal
        projectId={projectId}
        locationId={location.id}
        locationName={location.name}
        scenes={scenes}
        canEdit={canEdit}
        onClose={() => setShowScene(false)}
        onSaved={onUpdate}
      />
    )}
    </>
  );
}
