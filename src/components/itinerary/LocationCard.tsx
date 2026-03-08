"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, Trash2, Upload, MapPin, MessageSquare, Navigation } from "lucide-react";
import { Location } from "@/lib/types";
import LocationNotes from "./LocationNotes";
import LocationGallery from "./LocationGallery";
import LocationLinks from "./LocationLinks";

interface Props {
  location: Location;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  isDragOverlay?: boolean;
}

export default function LocationCard({ location, canEdit, projectId, onUpdate, isDragOverlay }: Props) {
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
  const [uploading, setUploading] = useState(false);
  const [showNotes, setShowNotes] = useState(!canEdit);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id, disabled: !canEdit });

  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

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

  const mapsUrl = location.latitude && location.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
    : null;

  return (
    <div ref={setNodeRef} style={style} className="bg-bg-card-hover border border-border rounded-xl overflow-hidden">
      {/* Hero image - always visible when available */}
      {location.photo_url && (
        <div className="relative">
          <img
            src={location.photo_url}
            alt={location.name}
            className="w-full object-cover max-h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2">
              {canEdit && (
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/70 hover:text-white">
                  <GripVertical className="w-4 h-4" />
                </button>
              )}
              <h4 className="font-semibold text-white text-lg">{location.name}</h4>
            </div>
            {location.address && (
              <div className="flex items-center gap-1.5 mt-1 text-white/70 text-sm">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{location.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header without image */}
      {!location.photo_url && (
        <div className="flex items-center gap-3 p-4">
          {canEdit && (
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary">
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text-primary">{location.name}</h4>
            {location.address && (
              <p className="text-text-secondary text-sm truncate mt-0.5">{location.address}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Toggle for cards with images */}
      {location.photo_url && (
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
            onClick={() => setExpanded(!expanded)}
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-xs"
          >
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Description */}
          {location.description && !editing && (
            <p className="text-text-secondary text-sm leading-relaxed">{location.description}</p>
          )}

          {/* Location meta */}
          {!editing && (
            <div className="space-y-2">
              {!location.photo_url && location.address && mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  View on Google Maps
                </a>
              )}
              {location.latitude && location.longitude && (
                <p className="text-text-muted text-xs">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
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
            <div className="flex flex-wrap gap-3 pt-1">
              <button onClick={() => setEditing(true)} className="text-sm text-accent hover:text-accent-hover transition-colors">
                Edit Details
              </button>
              <label className="text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              <button onClick={deleteLocation} className="text-sm text-danger hover:text-danger-hover transition-colors ml-auto">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Location name"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
                <input
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes"
                rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          <LocationGallery projectId={projectId} locationId={location.id} canEdit={canEdit} />

          {/* Links & References */}
          <LocationLinks projectId={projectId} locationId={location.id} canEdit={canEdit} />

          {/* Comments (only in expanded for viewers) */}
          {!canEdit && (
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Comments
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showNotes && (
                <div className="mt-3">
                  <LocationNotes projectId={projectId} locationId={location.id} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments - always visible for editors even when collapsed */}
      {canEdit && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-1"
          >
            <MessageSquare className="w-4 h-4" />
            Comments
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showNotes && (
            <div className="mt-3">
              <LocationNotes projectId={projectId} locationId={location.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
