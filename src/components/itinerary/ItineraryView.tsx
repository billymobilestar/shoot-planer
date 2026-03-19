"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Plus, CalendarDays, MapPin, Route, Clock, List, Calendar, FilmIcon, Car, Navigation, Loader2, Home, X as XIcon, CheckCircle2, ArrowRight } from "lucide-react";
import { ShootDayWithLocations, Location } from "@/lib/types";

import { useTracking } from "@/components/tracking/TrackingProvider";
import TrackingBanner from "@/components/tracking/TrackingBanner";
import DayColumn from "./DayColumn";
import DriveConnector from "./DriveConnector";
import DeleteDayModal from "./DeleteDayModal";
import InsertDayModal from "./InsertDayModal";
import MapsRouteModal from "./MapsRouteModal";
import AddressAutocomplete from "../AddressAutocomplete";
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
  onProgressChange?: (completed: number, total: number) => void;
}

export default function ItineraryView({ projectId, canEdit, startDate, onDaysCountChange, onProgressChange }: Props) {
  const [days, setDays] = useState<ShootDayWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [deletedDay, setDeletedDay] = useState<{ day: ShootDayWithLocations; label: string } | null>(null);
  const [dayToDelete, setDayToDelete] = useState<ShootDayWithLocations | null>(null);
  const [insertAfterDay, setInsertAfterDay] = useState<number | null>(null);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [showTodayMapsModal, setShowTodayMapsModal] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeCheckDone, setHomeCheckDone] = useState(false);
  const [showHomeForm, setShowHomeForm] = useState(false);
  const [homeInput, setHomeInput] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [savingHome, setSavingHome] = useState(false);
  const [homeDismissed, setHomeDismissed] = useState(false);

  const { active: trackingActive, start: startTracking, stop: stopTracking, setLocations: setTrackingLocations, loading: trackingLoading } = useTracking();

  // Feed all locations into the tracking context whenever days change
  useEffect(() => {
    const allLocs = days.flatMap((d) => d.locations);
    setTrackingLocations(allLocs);
  }, [days, setTrackingLocations]);

  // Mark a location as completed (from arrival banner)
  async function markLocationCompleted(locationId: string) {
    await fetch(`/api/projects/${projectId}/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    fetchDays();
  }

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
      const allLocs = data.flatMap((d: { locations: { completed?: boolean }[] }) => d.locations);
      onProgressChange?.(allLocs.filter((l: { completed?: boolean }) => l.completed).length, allLocs.length);
    }
    setLoading(false);
  }, [projectId, onDaysCountChange]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  // Check if user has home address set
  useEffect(() => {
    fetch("/api/user-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.home_address) setHomeAddress(data.home_address);
        setHomeCheckDone(true);
      })
      .catch(() => setHomeCheckDone(true));
  }, []);

  async function saveHomeAddress() {
    if (!homeLat || !homeLng) return;
    setSavingHome(true);
    const res = await fetch("/api/user-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ home_address: homeInput, home_latitude: homeLat, home_longitude: homeLng }),
    });
    if (res.ok) {
      setHomeAddress(homeInput);
      setShowHomeForm(false);
    }
    setSavingHome(false);
  }

  // Auto-detect current shoot day based on start_date + today
  const todaysDayInfo = useMemo(() => {
    if (!startDate || days.length === 0) return null;
    const start = new Date(startDate + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const todayDayNumber = diffDays + 1; // Day 1 = start_date

    const currentDay = days.find((d) => d.day_number === todayDayNumber);
    if (!currentDay) return null;

    const nextUncompleted = currentDay.locations.find((l) => !l.completed);
    const remainingLocations = currentDay.locations.filter((l) => !l.completed);
    const allDone = currentDay.locations.length > 0 && remainingLocations.length === 0;

    return {
      day: currentDay,
      dayNumber: todayDayNumber,
      nextUncompleted,
      remainingLocations,
      allDone,
    };
  }, [startDate, days]);

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

  async function handleShiftDay(dayNumber: number, direction: "up" | "down") {
    const visibleDays = days.filter((d) => d.id !== deletedDay?.day.id);
    const idx = visibleDays.findIndex((d) => d.day_number === dayNumber);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= visibleDays.length) return;

    const current = visibleDays[idx];
    const neighbor = visibleDays[neighborIdx];

    await fetch(`/api/projects/${projectId}/days/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [
          { id: current.id, day_number: neighbor.day_number },
          { id: neighbor.id, day_number: current.day_number },
        ],
      }),
    });

    fetchDays();
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

  function requestInsertDay(dayNumber: number) {
    setInsertAfterDay(dayNumber);
  }

  async function confirmInsertDay() {
    if (insertAfterDay === null) return;
    const dayNumber = insertAfterDay;
    setInsertAfterDay(null);
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
          <button
            onClick={() => {
              if (trackingActive) stopTracking();
              else startTracking();
            }}
            className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-colors ${
              trackingActive
                ? "bg-success hover:bg-success/80 text-white"
                : "bg-bg-primary border border-border text-text-secondary hover:text-text-primary hover:border-accent"
            }`}
          >
            {trackingLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className={`w-4 h-4 ${trackingActive ? "animate-pulse" : ""}`} />
            )}
            {trackingActive ? "Tracking" : "Track Location"}
          </button>
        )}
        {totalLocations > 0 && (
          <button
            onClick={() => setShowMapsModal(true)}
            className="flex items-center gap-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Route className="w-4 h-4" />
            <span className="hidden sm:inline">View in Google Maps</span>
            <span className="sm:hidden">Maps</span>
          </button>
        )}
      </div>

      {/* Tracking Banner */}
      <TrackingBanner projectId={projectId} onMarkCompleted={markLocationCompleted} />

      {/* Today's Shoot Day Banner */}
      {todaysDayInfo && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center shrink-0">
              <span className="font-bold text-accent text-sm leading-none">{todaysDayInfo.dayNumber}</span>
              <span className="text-[8px] uppercase tracking-wider text-accent/60">Today</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {todaysDayInfo.day.title || `Day ${todaysDayInfo.dayNumber}`}
              </p>
              {todaysDayInfo.allDone ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs text-success font-medium">All {todaysDayInfo.day.locations.length} locations completed!</span>
                </div>
              ) : todaysDayInfo.nextUncompleted ? (
                <div className="mt-1">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-accent" />
                    <span className="text-xs text-text-secondary">Next:</span>
                    <span className="text-xs font-medium text-text-primary truncate">{todaysDayInfo.nextUncompleted.name}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {todaysDayInfo.remainingLocations.length} of {todaysDayInfo.day.locations.length} locations remaining
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-muted mt-1">No locations scheduled</p>
              )}
            </div>
            {todaysDayInfo.remainingLocations.length > 0 && (
              <button
                onClick={() => setShowTodayMapsModal(true)}
                className="shrink-0 flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors"
              >
                <Route className="w-3.5 h-3.5" />
                Today&apos;s Route
              </button>
            )}
          </div>
        </div>
      )}

      {/* Home Address CTA */}
      {homeCheckDone && !homeAddress && !homeDismissed && totalLocations > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
          {!showHomeForm ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">Set your home address</p>
                <p className="text-xs text-text-muted mt-0.5">Get driving routes from home to your shoot locations</p>
              </div>
              <button
                onClick={() => setShowHomeForm(true)}
                className="shrink-0 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Add
              </button>
              <button onClick={() => setHomeDismissed(true)} className="shrink-0 text-text-muted hover:text-text-primary transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">Enter your home address</p>
                </div>
              </div>
              <AddressAutocomplete
                value={homeInput}
                onChange={setHomeInput}
                onPlaceSelect={(place) => {
                  setHomeInput(place.address);
                  setHomeLat(place.latitude);
                  setHomeLng(place.longitude);
                }}
                placeholder="Search your address..."
                className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHomeForm(false)}
                  className="bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveHomeAddress}
                  disabled={!homeLat || !homeLng || savingHome}
                  className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingHome ? "Saving..." : "Save Home Address"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Home address saved indicator */}
      {homeCheckDone && homeAddress && !homeDismissed && totalLocations > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center gap-3">
          <Home className="w-4 h-4 text-accent shrink-0" />
          <span className="text-sm text-text-secondary flex-1 truncate">Home: {homeAddress}</span>
          <button
            onClick={() => { setShowHomeForm(true); setHomeInput(homeAddress); setHomeAddress(null); }}
            className="text-xs text-text-muted hover:text-accent transition-colors shrink-0"
          >
            Change
          </button>
        </div>
      )}

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
                  <div className="relative py-3">
                    {prevLastLoc && currFirstLoc ? (
                      <div className="flex justify-center">
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
                      <button
                        onClick={() => requestInsertDay(prevDay!.day_number)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent-hover active:bg-accent-hover transition-all shadow-md"
                        title="Insert a new day here"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert Day
                      </button>
                    )}
                  </div>
                )}
                <DayColumn
                  day={day}
                  canEdit={canEdit}
                  projectId={projectId}
                  onUpdate={fetchDays}
                  onRequestDeleteDay={canEdit ? () => openDeleteModal(day) : undefined}
                  onShiftDay={canEdit ? (direction) => handleShiftDay(day.day_number, direction) : undefined}
                  isFirst={dayIdx === 0}
                  isLast={dayIdx === visibleDays.length - 1}
                  dayDate={startDate ? (() => {
                    const d = new Date(startDate + "T00:00:00");
                    d.setDate(d.getDate() + day.day_number - 1);
                    return d.toISOString().slice(0, 10);
                  })() : null}
                  isToday={todaysDayInfo?.dayNumber === day.day_number}
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

      {insertAfterDay !== null && (
        <InsertDayModal
          afterDayNumber={insertAfterDay}
          totalDays={days.length}
          onConfirm={confirmInsertDay}
          onClose={() => setInsertAfterDay(null)}
        />
      )}

      {showMapsModal && (
        <MapsRouteModal
          locations={allLocations}
          label={`All ${days.length} days`}
          onClose={() => setShowMapsModal(false)}
        />
      )}

      {showTodayMapsModal && todaysDayInfo && (
        <MapsRouteModal
          locations={todaysDayInfo.remainingLocations}
          label={`Today — ${todaysDayInfo.day.title || `Day ${todaysDayInfo.dayNumber}`}`}
          onClose={() => setShowTodayMapsModal(false)}
        />
      )}
    </div>
  );
}
