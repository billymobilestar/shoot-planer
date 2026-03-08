"use client";

import { useState } from "react";
import { X, Upload, Image as ImageIcon, Check } from "lucide-react";
import { Location, ShootReference } from "@/lib/types";

interface Props {
  projectId: string;
  locations: Location[];
  references: ShootReference[];
  onCreated: () => void;
  onClose: () => void;
}

const shotTypes = [
  "Wide", "Medium", "Close-up", "Extreme Close-up", "Aerial/Drone",
  "Tracking", "Handheld", "Timelapse", "Slow Motion", "POV", "Other",
];

export default function AddShotModal({ projectId, locations, references, onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    shot_type: "",
    location_id: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setImageUrl(url);
      setShowPicker(false);
    }
    setUploading(false);
  }

  function selectExisting(url: string) {
    setImageUrl(url);
    setShowPicker(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    await fetch(`/api/projects/${projectId}/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        shot_type: form.shot_type || null,
        image_url: imageUrl || null,
        location_id: form.location_id || null,
      }),
    });

    onCreated();
    onClose();
  }

  const existingImages = references.filter((r) => r.image_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Add Shot</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Wide establishing shot of canyon"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the shot..."
              rows={3}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Shot Type</label>
              <select
                value={form.shot_type}
                onChange={(e) => setForm((f) => ({ ...f, shot_type: e.target.value }))}
                className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Select type</option>
                {shotTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Location</label>
              <select
                value={form.location_id}
                onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Reference Image</label>
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Preview" className="w-full rounded-lg object-contain max-h-40" />
                <button type="button" onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : showPicker ? (
              <div className="space-y-3">
                {/* Upload option */}
                <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading ? "Uploading..." : "Upload new image"}</span>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>

                {/* Existing images grid */}
                {existingImages.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-[11px] text-text-muted uppercase tracking-wider">Or choose from moodboard</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-0.5">
                      {existingImages.map((ref) => (
                        <button
                          key={ref.id}
                          type="button"
                          onClick={() => selectExisting(ref.image_url)}
                          className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-accent active:border-accent transition-colors group/img"
                        >
                          <img src={ref.image_url} alt={ref.title || ""} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-accent/0 group-hover/img:bg-accent/20 active:bg-accent/20 transition-colors flex items-center justify-center">
                            <Check className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 drop-shadow-lg transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button type="button" onClick={() => setShowPicker(false)} className="w-full text-center text-xs text-text-muted hover:text-text-primary transition-colors py-1">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading ? "Uploading..." : "Upload"}</span>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
                {existingImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Existing</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!form.title.trim() || saving} className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50">
              {saving ? "Adding..." : "Add Shot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
