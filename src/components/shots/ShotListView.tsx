"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Shot, Location, ShotStatus } from "@/lib/types";
import ShotCard from "./ShotCard";
import AddShotModal from "./AddShotModal";

interface Props {
  projectId: string;
  canEdit: boolean;
}

const statusFilters: { label: string; value: ShotStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ShotListView({ projectId, canEdit }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ShotStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const [shotsRes, locsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/shots`),
      fetch(`/api/projects/${projectId}/locations`),
    ]);
    if (shotsRes.ok) setShots(await shotsRes.json());
    if (locsRes.ok) setLocations(await locsRes.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = shots.filter((shot) => {
    if (statusFilter !== "all" && shot.status !== statusFilter) return false;
    if (locationFilter !== "all" && shot.location_id !== locationFilter) return false;
    return true;
  });

  const planned = shots.filter((s) => s.status === "planned").length;
  const completed = shots.filter((s) => s.status === "completed").length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-bg-card border border-border rounded-xl animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="w-4 h-4 text-accent" />
          <span className="text-text-primary font-medium">{shots.length}</span>
          <span className="text-text-secondary">total shots</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="text-sm">
          <span className="text-warning">{planned} planned</span>
          <span className="text-text-muted mx-2">/</span>
          <span className="text-success">{completed} completed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                statusFilter === sf.value
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {locations.length > 0 && (
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Shot
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ListChecks className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No shots yet.</p>
          {canEdit && <p className="text-text-muted text-sm mt-1">Add shots to track what you need to capture.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              locations={locations}
              canEdit={canEdit}
              projectId={projectId}
              onUpdate={fetchData}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddShotModal
          projectId={projectId}
          locations={locations}
          onCreated={fetchData}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
