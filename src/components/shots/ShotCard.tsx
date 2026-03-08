"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, MapPin, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Shot, Location, ShotStatus } from "@/lib/types";

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
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
}

export default function ShotCard({ shot, locations, canEdit, projectId, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(!canEdit);
  const [statusOpen, setStatusOpen] = useState(false);
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
