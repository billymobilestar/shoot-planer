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
import { Plus, CalendarDays, MapPin, Route, Clock, List, Calendar, FilmIcon, Car } from "lucide-react";
import { ShootDayWithLocations, Location } from "@/lib/types";
import { generateGoogleMapsUrl } from "@/lib/utils";
import DayColumn from "./DayColumn";
import DriveConnector from "./DriveConnector";
import DeleteDayModal from "./DeleteDayModal";
import UndoToast from "@/components/ui/UndoToast";
import LocationCard from "./LocationCard";
import CalendarView from "./CalendarView";

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

interface Props {
  projectId: string;
  canEdit: boolean;
  startDate?: string | null;
  onDaysCountChange?: (count: number) => void;
}

export default function ItineraryView({ projectId, canEdit, startDate, onDaysCountChange }: Props) {
  const [days, setDays] = useState<ShootDayWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [deletedDay, setDeletedDay] = useState<{ day: ShootDayWithLocations; label: string } | null>(null);
  const [dayToDelete, setDayToDelete] = useState<ShootDayWithLocations | null>(null);

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

  function openDeleteModal(day: ShootDayWithLocations) {
    setDayToDelete(day);
  }

  async function handleDeleteAndShift(dayId: string, label: string, dayData: ShootDayWithLocations) {
    setDayToDelete(null);
    await fetch(`/api/projects/${projectId}/days/${dayId}`, { method: "DELETE" });
    fetchDays();
    setDeletedDay({ day: dayData, label });
  }

  async function handleClearDay(dayId: string) {
    setDayToDelete(null);
    await fetch(`/api/projects/${projectId}/days/${dayId}?mode=clear`, { method: "DELETE" });
    fetchDays();
  }

  async function undoDayDelete() {
    if (!deletedDay) return;
    const { day } = deletedDay;
    setDeletedDay(null);

    // Re-create the day at its original position
    const res = await fetch(`/api/projects/${projectId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: day.title,
        date: day.date,
        insert_after_day_number: day.day_number - 1,
      }),
    });
    if (!res.ok) { fetchDays(); return; }
    const newDay = await res.json();

    // Re-create all locations
    for (const loc of day.locations) {
      await fetch(`/api/projects/${projectId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoot_day_id: newDay.id,
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
    }
    fetchDays();
  }

  function dismissDayDelete() {
    setDeletedDay(null);
  }

  async function insertDayAfter(dayNumber: number) {
    await fetch(`/api/projects/${projectId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insert_after_day_number: dayNumber }),
    });
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

  // Three-part duration calculations
  const totalDrivingMinutes = allLocations.reduce((sum, loc) => sum + parseDriveMinutes(loc.drive_time_from_previous), 0);
  const totalFilmingMinutes = allLocations.reduce((sum, loc) => {
    const sceneDuration = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
    const shootTime = sceneDuration > 0 ? sceneDuration : (loc.shoot_minutes || 0);
    return sum + (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0);
  }, 0);
  const totalBreakMinutes = allLocations.reduce((sum, loc) => sum + (loc.break_after_minutes || 0), 0);
  const grandTotalMinutes = totalFilmingMinutes + totalDrivingMinutes + totalBreakMinutes;

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
        {totalFilmingMinutes > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <FilmIcon className="w-4 h-4 text-accent" />
              <span className="text-text-primary font-medium">{fmtMins(totalFilmingMinutes)}</span>
              <span className="text-text-secondary">filming</span>
            </div>
          </>
        )}
        {totalDrivingMinutes > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Car className="w-4 h-4 text-accent" />
              <span className="text-text-primary font-medium">{fmtMins(totalDrivingMinutes)}</span>
              <span className="text-text-secondary">driving</span>
            </div>
          </>
        )}
        {grandTotalMinutes > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-text-primary font-medium">{fmtMins(grandTotalMinutes)}</span>
              <span className="text-text-secondary">total</span>
            </div>
          </>
        )}
        <div className="flex-1" />
        {/* View toggle */}
        {startDate && (
          <div className="flex items-center bg-bg-primary rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "list" ? "bg-bg-card text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-bg-card text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        )}
        {totalLocations > 0 && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Route className="w-4 h-4" />
            <span className="hidden sm:inline">View in Google Maps</span>
            <span className="sm:hidden">Maps</span>
          </a>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && startDate && (
        <CalendarView days={days} startDate={startDate} />
      )}

      {/* Days (List View) */}
      {viewMode === "list" && <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-0">
          {days.filter((d) => d.id !== deletedDay?.day.id).map((day, dayIdx, visibleDays) => {
            const prevDay = dayIdx > 0 ? visibleDays[dayIdx - 1] : null;
            const prevLastLoc = prevDay?.locations?.[prevDay.locations.length - 1];
            const currFirstLoc = day.locations?.[0];

            return (
              <div key={day.id}>
                {dayIdx > 0 && (
                  <div className="relative group/insert-day">
                    {prevLastLoc && currFirstLoc ? (
                      <div className="py-3 flex flex-col items-center">
                        <DriveConnector
                          originLat={prevLastLoc.latitude}
                          originLng={prevLastLoc.longitude}
                          destLat={currFirstLoc.latitude}
                          destLng={currFirstLoc.longitude}
                        />
                      </div>
                    ) : (
                      <div className="h-6" />
                    )}
                    {/* Insert day between */}
                    {canEdit && (
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 pointer-events-none">
                        <button
                          onClick={() => insertDayAfter(prevDay!.day_number)}
                          className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/80 sm:bg-accent text-white text-xs font-medium opacity-60 sm:opacity-0 sm:group-hover/insert-day:opacity-100 hover:opacity-100 active:opacity-100 hover:bg-accent-hover active:bg-accent-hover transition-all shadow-md"
                          title="Insert a new day here"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Insert Day</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <DayColumn
                  day={day}
                  canEdit={canEdit}
                  projectId={projectId}
                  onUpdate={fetchDays}
                  onRequestDeleteDay={canEdit ? () => openDeleteModal(day) : undefined}
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
      </DndContext>}

      {canEdit && (
        <button
          onClick={addDay}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-accent hover:border-accent transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Day
        </button>
      )}

      {deletedDay && (
        <UndoToast
          key={deletedDay.day.id}
          message={`"${deletedDay.label}" deleted`}
          onUndo={undoDayDelete}
          onDismiss={dismissDayDelete}
        />
      )}

      {dayToDelete && (
        <DeleteDayModal
          day={dayToDelete}
          totalDays={days.length}
          onDeleteAndShift={() => handleDeleteAndShift(dayToDelete.id, dayToDelete.title || `Day ${dayToDelete.day_number}`, dayToDelete)}
          onClearDay={() => handleClearDay(dayToDelete.id)}
          onClose={() => setDayToDelete(null)}
        />
      )}
    </div>
  );
}
