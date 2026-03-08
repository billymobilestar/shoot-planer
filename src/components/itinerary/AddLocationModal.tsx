"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import AddressAutocomplete from "../AddressAutocomplete";

interface Props {
  projectId: string;
  shootDayId: string;
  position: number;
  onCreated: () => void;
  onClose: () => void;
}

export default function AddLocationModal({ projectId, shootDayId, position, onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    drive_time_from_previous: "",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      setPhotoUrl(url);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    await fetch(`/api/projects/${projectId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shoot_day_id: shootDayId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        drive_time_from_previous: form.drive_time_from_previous.trim() || null,
        photo_url: photoUrl || null,
        position,
      }),
    });

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Add Location</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Mather Point, Grand Canyon"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the location..."
              rows={2}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm((f) => ({ ...f, address: val }))}
              onPlaceSelect={(place) =>
                setForm((f) => ({
                  ...f,
                  address: place.address,
                  latitude: String(place.latitude),
                  longitude: String(place.longitude),
                  name: f.name || place.name || f.name,
                }))
              }
              placeholder="Search for an address..."
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Latitude</label>
              <input
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                placeholder="32.1234"
                type="number"
                step="any"
                className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Longitude</label>
              <input
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                placeholder="-111.5678"
                type="number"
                step="any"
                className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Drive Time from Previous</label>
            <input
              value={form.drive_time_from_previous}
              onChange={(e) => setForm((f) => ({ ...f, drive_time_from_previous: e.target.value }))}
              placeholder="e.g. 1h 45m"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Photo</label>
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Preview" className="w-full rounded-lg object-contain max-h-40" />
                <button type="button" onClick={() => setPhotoUrl("")} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                {uploading ? "Uploading..." : "Drop image or click to upload"}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!form.name.trim() || saving} className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50">
              {saving ? "Adding..." : "Add Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
