"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2, Pencil, Check, X, MapPin } from "lucide-react";
import { ShootDayWithLocations } from "@/lib/types";
import LocationCard from "./LocationCard";
import DriveConnector from "./DriveConnector";
import AddLocationModal from "./AddLocationModal";

interface Props {
  day: ShootDayWithLocations;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
}

export default function DayColumn({ day, canEdit, projectId, onUpdate }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(day.title || "");
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  async function deleteDay() {
    await fetch(`/api/projects/${projectId}/days/${day.id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <div
      ref={setNodeRef}
      className={`bg-bg-card border rounded-xl overflow-hidden transition-colors ${
        isOver ? "border-accent bg-accent-muted" : "border-border"
      }`}
    >
      {/* Day Header */}
      <div className="bg-bg-card-hover px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex flex-col items-center justify-center">
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
            <div>
              <h3 className="font-semibold text-text-primary text-lg">
                {day.title || `Day ${day.day_number}`}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {day.date && (
                  <span className="text-text-secondary text-sm">
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                )}
                <span className="text-text-muted text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {day.locations.length} {day.locations.length === 1 ? "location" : "locations"}
                </span>
              </div>
            </div>
          )}
          {canEdit && !editingTitle && (
            <button onClick={() => { setTitleValue(day.title || ""); setEditingTitle(true); }} className="text-text-muted hover:text-text-primary">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">Delete day?</span>
                <button onClick={deleteDay} className="text-danger hover:text-danger-hover font-medium">Yes</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-text-secondary">No</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="text-text-muted hover:text-danger transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Locations */}
      <div className="p-4">
        <SortableContext items={day.locations.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {day.locations.map((location, idx) => (
              <div key={location.id}>
                {idx > 0 && (
                  <DriveConnector
                    driveTime={location.drive_time_from_previous}
                    driveDistance={location.drive_distance_from_previous}
                    originLat={day.locations[idx - 1].latitude}
                    originLng={day.locations[idx - 1].longitude}
                    destLat={location.latitude}
                    destLng={location.longitude}
                    locationId={location.id}
                    projectId={projectId}
                  />
                )}
                <LocationCard
                  location={location}
                  canEdit={canEdit}
                  projectId={projectId}
                  onUpdate={onUpdate}
                />
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
            onClick={() => setShowAddLocation(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      {showAddLocation && (
        <AddLocationModal
          projectId={projectId}
          shootDayId={day.id}
          position={day.locations.length}
          onCreated={onUpdate}
          onClose={() => setShowAddLocation(false)}
        />
      )}
    </div>
  );
}
