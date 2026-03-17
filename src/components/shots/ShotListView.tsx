"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ListChecks, Search, Download, X, CheckSquare } from "lucide-react";
import { Shot, Location, ShotStatus, ShootReference } from "@/lib/types";
import ShotCard from "./ShotCard";
import AddShotModal from "./AddShotModal";
import UndoToast from "@/components/ui/UndoToast";

interface Props {
  projectId: string;
  canEdit: boolean;
  currentUserId: string;
}

const statusFilters: { label: string; value: ShotStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusLabels: Record<ShotStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ShotListView({ projectId, canEdit, currentUserId }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [references, setReferences] = useState<ShootReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ShotStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [deletedShot, setDeletedShot] = useState<{ shot: Shot; title: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [shotsRes, locsRes, refsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/shots`),
      fetch(`/api/projects/${projectId}/locations`),
      fetch(`/api/projects/${projectId}/references`),
    ]);
    if (shotsRes.ok) setShots(await shotsRes.json());
    if (locsRes.ok) setLocations(await locsRes.json());
    if (refsRes.ok) setReferences(await refsRes.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = shots.filter((shot) => {
    if (shot.id === deletedShot?.shot.id) return false;
    if (statusFilter !== "all" && shot.status !== statusFilter) return false;
    if (locationFilter !== "all" && shot.location_id !== locationFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!shot.title.toLowerCase().includes(q) && !(shot.description || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function requestDelete(id: string, title: string) {
    const shotData = shots.find((s) => s.id === id);
    if (!shotData) return;

    await fetch(`/api/projects/${projectId}/shots/${id}`, { method: "DELETE" });
    fetchData();
    setDeletedShot({ shot: shotData, title });
  }

  async function undoDelete() {
    if (!deletedShot) return;
    const s = deletedShot.shot;
    setDeletedShot(null);

    await fetch(`/api/projects/${projectId}/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.title,
        description: s.description,
        shot_type: s.shot_type,
        image_url: s.image_url,
        status: s.status,
        location_id: s.location_id,
        notes: s.notes,
        position: s.position,
      }),
    });
    fetchData();
  }

  function dismissDelete() {
    setDeletedShot(null);
  }

  const planned = shots.filter((s) => s.status === "planned").length;
  const completed = shots.filter((s) => s.status === "completed").length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((s) => s.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function applyBulkStatus(status: ShotStatus) {
    setBulkApplying(true);
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/projects/${projectId}/shots/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setBulkApplying(false);
    clearSelection();
    fetchData();
  }

  function exportCSV() {
    const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
    const rows = [
      ["#", "Title", "Type", "Status", "Location", "Description", "Notes"],
      ...shots.map((s, i) => [
        String(i + 1),
        s.title,
        s.shot_type || "",
        statusLabels[s.status],
        s.location_id ? (locationMap[s.location_id] || "") : "",
        s.description || "",
        s.notes || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shot-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <div className="flex-1" />
        {shots.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Filters + Search */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1 overflow-x-auto flex-1 min-w-0">
            {statusFilters.map((sf) => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm whitespace-nowrap transition-colors ${
                  statusFilter === sf.value ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Shot</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent flex-1 min-w-0"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shots…"
              className="w-full pl-8 pr-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {canEdit && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl">
          <CheckSquare className="w-4 h-4 text-accent shrink-0" />
          <span className="text-sm font-medium text-text-primary">{selectedIds.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted">Mark as:</span>
            {(["planned", "in_progress", "completed", "cancelled"] as ShotStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => applyBulkStatus(s)}
                disabled={bulkApplying}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent hover:text-accent text-text-secondary transition-colors disabled:opacity-50"
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={selectAll} className="text-xs text-accent hover:text-accent-hover">Select all ({filtered.length})</button>
          <button onClick={clearSelection} className="text-xs text-text-muted hover:text-text-primary">Clear</button>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ListChecks className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">{search ? `No shots matching "${search}"` : "No shots yet."}</p>
          {canEdit && !search && <p className="text-text-muted text-sm mt-1">Add shots to track what you need to capture.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {filtered.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              locations={locations}
              references={references}
              canEdit={canEdit}
              projectId={projectId}
              currentUserId={currentUserId}
              onUpdate={fetchData}
              onRequestDelete={() => requestDelete(shot.id, shot.title)}
              isSelected={selectedIds.has(shot.id)}
              onToggleSelect={canEdit ? () => toggleSelect(shot.id) : undefined}
              expanded={canEdit ? expandedId === shot.id : true}
              onToggleExpand={() => setExpandedId((prev) => prev === shot.id ? null : shot.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddShotModal
          projectId={projectId}
          locations={locations}
          references={references}
          onCreated={fetchData}
          onClose={() => setShowAdd(false)}
        />
      )}

      {deletedShot && (
        <UndoToast
          key={deletedShot.shot.id}
          message={`"${deletedShot.title}" deleted`}
          onUndo={undoDelete}
          onDismiss={dismissDelete}
        />
      )}
    </div>
  );
}
