"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { Plus, CalendarDays, MapPin, Route, Clock } from "lucide-react";
import { ShootDayWithLocations, Location } from "@/lib/types";
import { generateGoogleMapsUrl } from "@/lib/utils";
import DayColumn from "./DayColumn";
import DriveConnector from "./DriveConnector";
import UndoToast from "@/components/ui/UndoToast";
import LocationCard from "./LocationCard";

interface Props {
  projectId: string;
  canEdit: boolean;
  startDate?: string | null;
  onDaysCountChange?: (count: number) => void;
}

export default function ItineraryView({ projectId, canEdit, startDate, onDaysCountChange }: Props) {
  const [days, setDays] = useState<ShootDayWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [pendingDayDelete, setPendingDayDelete] = useState<{ id: string; label: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchDays = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/days`);
    if (res.ok) {
      const data = await res.json();
      setDays(data);
      onDaysCountChange?.(data.length);
    }
    setLoading(false);
  }, [projectId, onDaysCountChange]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  async function addDay() {
    await fetch(`/api/projects/${projectId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchDays();
  }

  function requestDayDelete(id: string, label: string) {
    if (pendingDayDelete) {
      fetch(`/api/projects/${projectId}/days/${pendingDayDelete.id}`, { method: "DELETE" }).then(fetchDays);
    }
    setPendingDayDelete({ id, label });
  }

  function undoDayDelete() {
    setPendingDayDelete(null);
  }

  async function commitDayDelete() {
    if (!pendingDayDelete) return;
    const id = pendingDayDelete.id;
    setPendingDayDelete(null);
    await fetch(`/api/projects/${projectId}/days/${id}`, { method: "DELETE" });
    fetchDays();
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const location = days
      .flatMap((d) => d.locations)
      .find((l) => l.id === active.id);
    setActiveLocation(location || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which day each belongs to
    let sourceDayIdx = days.findIndex((d) => d.locations.some((l) => l.id === activeId));
    let destDayIdx = days.findIndex((d) => d.locations.some((l) => l.id === overId));

    // If over is a day droppable (not a location)
    if (destDayIdx === -1) {
      destDayIdx = days.findIndex((d) => d.id === overId);
    }

    if (sourceDayIdx === -1 || destDayIdx === -1 || sourceDayIdx === destDayIdx) return;

    setDays((prev) => {
      const newDays = prev.map((d) => ({ ...d, locations: [...d.locations] }));
      const locIdx = newDays[sourceDayIdx].locations.findIndex((l) => l.id === activeId);
      const [movedLoc] = newDays[sourceDayIdx].locations.splice(locIdx, 1);
      movedLoc.shoot_day_id = newDays[destDayIdx].id;
      movedLoc.drive_time_from_previous = null;
      movedLoc.drive_distance_from_previous = null;

      const overLocIdx = newDays[destDayIdx].locations.findIndex((l) => l.id === overId);
      if (overLocIdx >= 0) {
        newDays[destDayIdx].locations.splice(overLocIdx, 0, movedLoc);
      } else {
        newDays[destDayIdx].locations.push(movedLoc);
      }

      return newDays;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLocation(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Build the new state first, then use it for both UI update and API call
    let newDays = days.map((d) => ({ ...d, locations: [...d.locations] }));

    const dayIdx = newDays.findIndex((d) => d.locations.some((l) => l.id === activeId));
    if (dayIdx === -1) return;

    const day = newDays[dayIdx];
    const oldIndex = day.locations.findIndex((l) => l.id === activeId);
    const newIndex = day.locations.findIndex((l) => l.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const [moved] = day.locations.splice(oldIndex, 1);
      day.locations.splice(newIndex, 0, moved);
    }

    // Clear stale drive data so DriveConnectors recalculate
    for (const d of newDays) {
      d.locations.forEach((loc) => {
        loc.drive_time_from_previous = null;
        loc.drive_distance_from_previous = null;
      });
    }

    setDays(newDays);

    // Build updates from the new state
    const updates = newDays.flatMap((d) =>
      d.locations.map((loc, idx) => ({
        id: loc.id,
        shoot_day_id: d.id,
        position: idx,
      }))
    );

    await fetch(`/api/projects/${projectId}/locations/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  const allLocations = days.flatMap((d) => d.locations);
  const totalLocations = allLocations.length;
  const mapsUrl = generateGoogleMapsUrl(allLocations);

  // Calculate total travel time by parsing drive_time_from_previous strings
  const totalTravelMinutes = allLocations.reduce((sum, loc) => {
    const t = loc.drive_time_from_previous;
    if (!t) return sum;
    let mins = 0;
    const hourMatch = t.match(/(\d+)\s*hour/);
    const minMatch = t.match(/(\d+)\s*min/);
    if (hourMatch) mins += parseInt(hourMatch[1]) * 60;
    if (minMatch) mins += parseInt(minMatch[1]);
    return sum + mins;
  }, 0);

  const travelHours = Math.floor(totalTravelMinutes / 60);
  const travelMins = totalTravelMinutes % 60;

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-bg-card border border-border rounded-xl p-6 animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-4 h-4 text-accent" />
          <span className="text-text-primary font-medium">{days.length}</span>
          <span className="text-text-secondary">days</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-accent" />
          <span className="text-text-primary font-medium">{totalLocations}</span>
          <span className="text-text-secondary">locations</span>
        </div>
        {totalTravelMinutes > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-text-primary font-medium">
                {travelHours > 0 ? `${travelHours}h ${travelMins}m` : `${travelMins}m`}
              </span>
              <span className="text-text-secondary">travel</span>
            </div>
          </>
        )}
        <div className="flex-1" />
        {totalLocations > 0 && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Route className="w-4 h-4" />
            View in Google Maps
          </a>
        )}
      </div>

      {/* Days */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-0">
          {days.filter((d) => d.id !== pendingDayDelete?.id).map((day, dayIdx, visibleDays) => {
            const prevDay = dayIdx > 0 ? visibleDays[dayIdx - 1] : null;
            const prevLastLoc = prevDay?.locations?.[prevDay.locations.length - 1];
            const currFirstLoc = day.locations?.[0];

            return (
              <div key={day.id}>
                {dayIdx > 0 && prevLastLoc && currFirstLoc && (
                  <div className="py-3 flex flex-col items-center">
                    <DriveConnector
                      originLat={prevLastLoc.latitude}
                      originLng={prevLastLoc.longitude}
                      destLat={currFirstLoc.latitude}
                      destLng={currFirstLoc.longitude}
                    />
                  </div>
                )}
                {dayIdx > 0 && !(prevLastLoc && currFirstLoc) && (
                  <div className="h-6" />
                )}
                <DayColumn
                  day={day}
                  canEdit={canEdit}
                  projectId={projectId}
                  onUpdate={fetchDays}
                  onRequestDeleteDay={canEdit ? () => requestDayDelete(day.id, day.title || `Day ${day.day_number}`) : undefined}
                  dayDate={startDate ? (() => {
                    const d = new Date(startDate + "T00:00:00");
                    d.setDate(d.getDate() + day.day_number - 1);
                    return d.toISOString().slice(0, 10);
                  })() : null}
                />
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeLocation ? (
            <div className="opacity-80">
              <LocationCard
                location={activeLocation}
                canEdit={false}
                projectId={projectId}
                onUpdate={() => {}}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {canEdit && (
        <button
          onClick={addDay}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-accent hover:border-accent transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Day
        </button>
      )}

      {pendingDayDelete && (
        <UndoToast
          key={pendingDayDelete.id}
          message={`"${pendingDayDelete.label}" deleted`}
          onUndo={undoDayDelete}
          onCommit={commitDayDelete}
        />
      )}
    </div>
  );
}
