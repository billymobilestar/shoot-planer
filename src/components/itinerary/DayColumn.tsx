"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2, Pencil, Check, X, MapPin, Clock, AlertTriangle, Coffee, ChevronDown, ChevronUp, FilmIcon, Car } from "lucide-react";
import { ShootDayWithLocations, Location } from "@/lib/types";
import LocationCard from "./LocationCard";
import DriveConnector from "./DriveConnector";
import AddLocationModal from "./AddLocationModal";
import UndoToast from "@/components/ui/UndoToast";

interface Props {
  day: ShootDayWithLocations;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  onRequestDeleteDay?: () => void;
  dayDate?: string | null;
}

function parseDriveMinutes(t: string | null): number {
  if (!t) return 0;
  let mins = 0;
  const h = t.match(/(\d+)\s*hour/);
  const m = t.match(/(\d+)\s*min/);
  if (h) mins += parseInt(h[1]) * 60;
  if (m) mins += parseInt(m[1]);
  return mins;
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function DayColumn({ day, canEdit, projectId, onUpdate, onRequestDeleteDay, dayDate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(day.title || "");
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [insertAtPosition, setInsertAtPosition] = useState<number | null>(null);
  const [deletedLocation, setDeletedLocation] = useState<{ location: Location; name: string } | null>(null);

  const { setNodeRef, isOver } = useDroppable({ id: day.id });

  async function saveTitle() {
    await fetch(`/api/projects/${projectId}/days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleValue.trim() }),
    });
    setEditingTitle(false);
    onUpdate();
  }

  async function requestLocationDelete(id: string, name: string) {
    const locData = day.locations.find((l) => l.id === id);
    if (!locData) return;

    // Delete immediately from server
    await fetch(`/api/projects/${projectId}/locations/${id}`, { method: "DELETE" });
    onUpdate();
    setDeletedLocation({ location: locData, name });
  }

  async function undoLocationDelete() {
    if (!deletedLocation) return;
    const loc = deletedLocation.location;
    setDeletedLocation(null);

    // Re-create the location
    await fetch(`/api/projects/${projectId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shoot_day_id: day.id,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        photo_url: loc.photo_url,
        position: loc.position,
        notes: loc.notes,
        prep_minutes: loc.prep_minutes,
        shoot_minutes: loc.shoot_minutes,
        wrap_minutes: loc.wrap_minutes,
        break_after_minutes: loc.break_after_minutes,
      }),
    });
    onUpdate();
  }

  function dismissLocationDelete() {
    setDeletedLocation(null);
  }

  function openInsertAt(position: number) {
    setInsertAtPosition(position);
    setShowAddLocation(true);
  }

  // Three-part duration: filming, driving, total
  const filmingMinutes = day.locations.reduce((sum, loc) => {
    const sceneDuration = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
    const shootTime = sceneDuration > 0 ? sceneDuration : (loc.shoot_minutes || 0);
    return sum + (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0);
  }, 0);
  const drivingMinutes = day.locations.reduce((sum, loc) => sum + parseDriveMinutes(loc.drive_time_from_previous), 0);
  const breakMinutes = day.locations.reduce((sum, loc) => sum + (loc.break_after_minutes || 0), 0);
  const totalMinutes = filmingMinutes + drivingMinutes + breakMinutes;
  const isOT = totalMinutes > 720;
  const displayDate = dayDate || day.date;

  return (
    <div
      ref={setNodeRef}
      className={`bg-bg-card border rounded-xl overflow-hidden transition-colors ${
        isOver ? "border-accent bg-accent-muted" : "border-border"
      }`}
    >
      {/* Day Header */}
      <div
        className={`bg-bg-card-hover px-5 py-4 flex items-center justify-between cursor-pointer select-none ${isOT && expanded ? "border-b border-warning/30" : ""}`}
        onClick={() => !editingTitle && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex flex-col items-center justify-center shrink-0">
            <span className="text-accent font-bold text-lg leading-none">{day.day_number}</span>
            <span className="text-accent/60 text-[10px] uppercase tracking-wider">Day</span>
          </div>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="bg-bg-input border border-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <button onClick={saveTitle} className="text-success"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingTitle(false)} className="text-text-muted"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-lg">
                {day.title || `Day ${day.day_number}`}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {displayDate && (
                  <span className="text-text-secondary text-sm">
                    {new Date(displayDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                )}
                <span className="text-text-muted text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {day.locations.length} {day.locations.length === 1 ? "location" : "locations"}
                </span>
                {filmingMinutes > 0 && (
                  <span className="text-text-muted text-sm flex items-center gap-1">
                    <FilmIcon className="w-3 h-3" />
                    {fmtMins(filmingMinutes)}
                  </span>
                )}
                {drivingMinutes > 0 && (
                  <span className="text-text-muted text-sm flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    {fmtMins(drivingMinutes)}
                  </span>
                )}
                {totalMinutes > 0 && (
                  <span className={`text-sm flex items-center gap-1 font-medium ${isOT ? "text-warning" : "text-text-muted"}`}>
                    <Clock className="w-3 h-3" />
                    {fmtMins(totalMinutes)}
                    {isOT && <AlertTriangle className="w-3 h-3 ml-0.5" />}
                  </span>
                )}
              </div>
              {isOT && (
                <p className="text-warning text-xs mt-1">
                  Shoot day exceeds 12 hours — crew OT may apply
                </p>
              )}
            </div>
          )}
          {canEdit && !editingTitle && (
            <button
              onClick={(e) => { e.stopPropagation(); setTitleValue(day.title || ""); setEditingTitle(true); }}
              className="text-text-muted hover:text-text-primary shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {canEdit && onRequestDeleteDay && (
            <button onClick={onRequestDeleteDay} className="text-text-muted hover:text-danger transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="text-text-muted hover:text-text-primary transition-colors p-0.5"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Locations */}
      {expanded && <div className="p-4">
        <SortableContext items={day.locations.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {day.locations.map((location, idx, visibleLocs) => (
              <div key={location.id}>
                {idx > 0 && (
                  <div className="relative group/connector">
                    <DriveConnector
                      driveTime={location.drive_time_from_previous}
                      driveDistance={location.drive_distance_from_previous}
                      originLat={visibleLocs[idx - 1].latitude}
                      originLng={visibleLocs[idx - 1].longitude}
                      destLat={location.latitude}
                      destLng={location.longitude}
                      locationId={location.id}
                      projectId={projectId}
                    />
                    {/* Insert location between */}
                    {canEdit && (
                      <button
                        onClick={() => openInsertAt(idx)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-accent/80 sm:bg-accent text-white text-[10px] font-medium opacity-60 sm:opacity-0 sm:group-hover/connector:opacity-100 hover:opacity-100 active:opacity-100 hover:bg-accent-hover active:bg-accent-hover transition-all shadow-md z-10"
                        title="Insert location here"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Insert</span>
                      </button>
                    )}
                  </div>
                )}
                <LocationCard
                  location={location}
                  canEdit={canEdit}
                  projectId={projectId}
                  onUpdate={onUpdate}
                  onRequestDelete={canEdit ? () => requestLocationDelete(location.id, location.name) : undefined}
                />
                {(location.break_after_minutes || 0) > 0 && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-text-muted">
                    <Coffee className="w-3.5 h-3.5 text-accent/60" />
                    <span>Break · {fmtMins(location.break_after_minutes)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        {day.locations.length === 0 && (
          <div className="py-10 text-center text-text-muted text-sm border border-dashed border-border rounded-lg">
            No locations yet.{canEdit ? " Add one below or drag from another day." : ""}
          </div>
        )}

        {canEdit && (
          <button
            onClick={() => { setInsertAtPosition(null); setShowAddLocation(true); }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>}

      {showAddLocation && (
        <AddLocationModal
          projectId={projectId}
          shootDayId={day.id}
          position={insertAtPosition ?? day.locations.length}
          onCreated={onUpdate}
          onClose={() => { setShowAddLocation(false); setInsertAtPosition(null); }}
        />
      )}

      {deletedLocation && (
        <UndoToast
          key={deletedLocation.location.id}
          message={`"${deletedLocation.name}" deleted`}
          onUndo={undoLocationDelete}
          onDismiss={dismissLocationDelete}
        />
      )}
    </div>
  );
}
