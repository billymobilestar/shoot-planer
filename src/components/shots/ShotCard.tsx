"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, MapPin, ChevronDown, ChevronUp, Check, Upload, Image as ImageIcon, X } from "lucide-react";
import { Shot, Location, ShotStatus, ShootReference } from "@/lib/types";

const statusStyles: Record<ShotStatus, string> = {
  planned: "bg-warning/10 text-warning",
  in_progress: "bg-accent-muted text-accent",
  completed: "bg-green-500/10 text-success",
  cancelled: "bg-bg-card-hover text-text-muted",
};

const statusDots: Record<ShotStatus, string> = {
  planned: "bg-warning",
  in_progress: "bg-accent",
  completed: "bg-success",
  cancelled: "bg-text-muted",
};

const statusLabels: Record<ShotStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const shotTypes = [
  "Wide", "Medium", "Close-up", "Extreme Close-up", "Aerial/Drone",
  "Tracking", "Handheld", "Timelapse", "Slow Motion", "POV", "Other",
];

interface Props {
  shot: Shot;
  locations: Location[];
  references: ShootReference[];
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
}

export default function ShotCard({ shot, locations, references, canEdit, projectId, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(!canEdit);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState(shot.image_url || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: shot.title,
    description: shot.description || "",
    shot_type: shot.shot_type || "",
    status: shot.status,
    location_id: shot.location_id || "",
    notes: shot.notes || "",
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    if (statusOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusOpen]);

  const assignedLocation = locations.find((l) => l.id === shot.location_id);
  const existingImages = references.filter((r) => r.image_url);

  async function save() {
    await fetch(`/api/projects/${projectId}/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        shot_type: form.shot_type || null,
        status: form.status,
        location_id: form.location_id || null,
        notes: form.notes || null,
        image_url: editImageUrl || null,
      }),
    });
    onUpdate();
  }

  async function deleteShot() {
    await fetch(`/api/projects/${projectId}/shots/${shot.id}`, { method: "DELETE" });
    onUpdate();
  }

  async function quickStatusChange(status: ShotStatus) {
    await fetch(`/api/projects/${projectId}/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setForm((f) => ({ ...f, status }));
    onUpdate();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setEditImageUrl(url);
      setShowImagePicker(false);
    }
    setUploadingImage(false);
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-border-light transition-colors">
      {shot.image_url && (
        <img src={shot.image_url} alt={shot.title} className="w-full h-52 object-cover" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-text-primary">{shot.title}</h4>
          {canEdit && (
            <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text-primary ml-2 shrink-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {canEdit ? (
            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all ${statusStyles[form.status]}`}
              >
                {statusLabels[form.status]}
                <ChevronDown className="w-3 h-3" />
              </button>
              {statusOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-bg-card border border-border rounded-lg shadow-lg py-1 min-w-35">
                  {(Object.keys(statusLabels) as ShotStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        quickStatusChange(s);
                        setStatusOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-bg-card-hover transition-colors ${form.status === s ? "text-accent font-medium" : "text-text-secondary"}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusDots[s]}`} />
                      {statusLabels[s]}
                      {form.status === s && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[shot.status]}`}>
              {statusLabels[shot.status]}
            </span>
          )}
          {shot.shot_type && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-bg-card-hover text-text-secondary">
              {shot.shot_type}
            </span>
          )}
        </div>

        {shot.description && (
          <p className={`text-text-secondary text-sm leading-relaxed mb-3 ${!expanded && canEdit ? "line-clamp-2" : ""}`}>
            {shot.description}
          </p>
        )}

        {assignedLocation && (
          <div className="flex items-center gap-1.5 text-sm text-accent">
            <MapPin className="w-3.5 h-3.5" />
            {assignedLocation.name}
          </div>
        )}

        {shot.notes && !canEdit && (
          <div className="mt-3 bg-bg-primary rounded-lg p-3 border border-border">
            <p className="text-text-secondary text-sm leading-relaxed">{shot.notes}</p>
          </div>
        )}

        {/* Expanded Edit Mode */}
        {expanded && canEdit && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
            />

            {/* Reference image editor */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Reference Image</label>
              {editImageUrl ? (
                <div className="relative">
                  <img src={editImageUrl} alt="" className="w-full rounded-lg object-contain max-h-32" />
                  <button
                    type="button"
                    onClick={() => { setEditImageUrl(""); setShowImagePicker(false); }}
                    className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : showImagePicker ? (
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingImage ? "Uploading..." : "Upload new"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {existingImages.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t border-border" />
                        <span className="text-[10px] text-text-muted">from moodboard</span>
                        <div className="flex-1 border-t border-border" />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-32 overflow-y-auto p-0.5">
                        {existingImages.map((ref) => (
                          <button
                            key={ref.id}
                            type="button"
                            onClick={() => { setEditImageUrl(ref.image_url); setShowImagePicker(false); }}
                            className="relative w-full rounded-lg overflow-hidden border-2 border-border hover:border-accent active:border-accent transition-colors group/img"
                          >
                            <div className="w-full pt-[100%] relative">
                              <img src={ref.image_url} alt={ref.title || ""} className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-accent/0 group-hover/img:bg-accent/20 active:bg-accent/20 transition-colors flex items-center justify-center">
                                <Check className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 drop-shadow-lg transition-opacity" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <button type="button" onClick={() => setShowImagePicker(false)} className="w-full text-center text-[11px] text-text-muted hover:text-text-primary py-0.5">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {existingImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors text-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Existing
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.shot_type}
                onChange={(e) => setForm((f) => ({ ...f, shot_type: e.target.value }))}
                className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Shot Type</option>
                {shotTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={form.status}
                onChange={(e) => {
                  const s = e.target.value as ShotStatus;
                  setForm((f) => ({ ...f, status: s }));
                  quickStatusChange(s);
                }}
                className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <select
              value={form.location_id}
              onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Assign to location</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
            />
            <div className="flex gap-2">
              <button onClick={save} className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                Save
              </button>
              <button onClick={deleteShot} className="text-danger hover:text-danger-hover ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
