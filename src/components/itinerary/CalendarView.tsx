"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, FilmIcon } from "lucide-react";
import { ShootDayWithLocations } from "@/lib/types";

interface Props {
  days: ShootDayWithLocations[];
  startDate: string;
  onDayClick?: (dayNumber: number) => void;
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarView({ days, startDate, onDayClick }: Props) {
  // Build a map of date string -> shoot day data
  const dayMap = useMemo(() => {
    const map = new Map<string, ShootDayWithLocations>();
    const base = new Date(startDate + "T00:00:00");
    for (const day of days) {
      const d = new Date(base);
      d.setDate(d.getDate() + day.day_number - 1);
      const key = d.toISOString().slice(0, 10);
      map.set(key, day);
    }
    return map;
  }, [days, startDate]);

  // Start viewing the month of the start date
  const startDateObj = new Date(startDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(startDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDateObj.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Calculate the last shoot date
  const lastShootDate = useMemo(() => {
    if (days.length === 0) return null;
    const maxDayNum = Math.max(...days.map((d) => d.day_number));
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + maxDayNum - 1);
    return d.toISOString().slice(0, 10);
  }, [days, startDate]);

  // Build calendar grid for current month
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Previous month padding
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; dateStr: string; inMonth: boolean }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
    cells.push({ date: d, dateStr: d.toISOString().slice(0, 10), inMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(viewYear, viewMonth, i);
    cells.push({ date: d, dateStr: d.toISOString().slice(0, 10), inMonth: true });
  }

  // Next month padding to complete the grid
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      cells.push({ date: d, dateStr: d.toISOString().slice(0, 10), inMonth: false });
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function goToStartDate() {
    setViewYear(startDateObj.getFullYear());
    setViewMonth(startDateObj.getMonth());
  }

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-text-primary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          {(viewYear !== startDateObj.getFullYear() || viewMonth !== startDateObj.getMonth()) && (
            <button
              onClick={goToStartDate}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Go to shoot start
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary hover:text-text-primary transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-text-muted py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map(({ date, dateStr, inMonth }) => {
          const shootDay = dayMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isStart = dateStr === startDate;
          const isEnd = dateStr === lastShootDate && days.length > 1;
          const isSelected = dateStr === selectedDate;
          const isShootDay = !!shootDay;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (shootDay) {
                  setSelectedDate(isSelected ? null : dateStr);
                  if (onDayClick) onDayClick(shootDay.day_number);
                }
              }}
              className={`
                min-h-20 sm:min-h-24 p-1.5 sm:p-2 flex flex-col transition-colors
                ${inMonth ? "bg-bg-card" : "bg-bg-primary"}
                ${isShootDay ? "cursor-pointer hover:bg-accent/5" : ""}
                ${isSelected ? "ring-2 ring-accent ring-inset" : ""}
              `}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${!inMonth ? "text-text-muted/40" : ""}
                    ${isToday ? "bg-accent text-white" : ""}
                    ${isStart && !isToday ? "bg-accent/20 text-accent font-bold" : ""}
                    ${isEnd && !isToday && !isStart ? "bg-accent/20 text-accent font-bold" : ""}
                    ${inMonth && !isToday && !isStart && !isEnd ? "text-text-primary" : ""}
                  `}
                >
                  {date.getDate()}
                </span>
                {isStart && (
                  <span className="text-[9px] text-accent font-bold uppercase tracking-wider hidden sm:block">Start</span>
                )}
                {isEnd && (
                  <span className="text-[9px] text-accent font-bold uppercase tracking-wider hidden sm:block">End</span>
                )}
              </div>

              {/* Shoot day info */}
              {isShootDay && (
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] sm:text-xs font-semibold text-accent truncate">
                    {shootDay.title || `Day ${shootDay.day_number}`}
                  </span>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    {shootDay.locations.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] text-text-muted flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{shootDay.locations.length}
                      </span>
                    )}
                    {(() => {
                      const totalMins = shootDay.locations.reduce((sum, loc) => {
                        const sceneDur = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
                        const shootTime = sceneDur > 0 ? sceneDur : (loc.shoot_minutes || 0);
                        return sum + (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0)
                          + (loc.break_after_minutes || 0) + parseDriveMinutes(loc.drive_time_from_previous);
                      }, 0);
                      if (totalMins === 0) return null;
                      return (
                        <span className={`text-[9px] sm:text-[10px] flex items-center gap-0.5 ${totalMins > 720 ? "text-warning font-medium" : "text-text-muted"}`}>
                          <Clock className="w-2.5 h-2.5" />{fmtMins(totalMins)}
                        </span>
                      );
                    })()}
                    {(() => {
                      const sceneCount = shootDay.locations.reduce((sum, loc) => sum + (loc.scenes?.length || 0), 0);
                      if (sceneCount === 0) return null;
                      return (
                        <span className="text-[9px] sm:text-[10px] text-text-muted flex items-center gap-0.5">
                          <FilmIcon className="w-2.5 h-2.5" />{sceneCount}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-text-primary">
                {selectedDay.title || `Day ${selectedDay.day_number}`}
              </h4>
              <p className="text-sm text-text-secondary">
                {new Date(selectedDate! + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button onClick={() => setSelectedDate(null)} className="text-text-muted hover:text-text-primary text-xs">
              Close
            </button>
          </div>
          {selectedDay.locations.length === 0 ? (
            <p className="text-sm text-text-muted">No locations scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDay.locations.map((loc, idx) => {
                const sceneDur = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
                const shootTime = sceneDur > 0 ? sceneDur : (loc.shoot_minutes || 0);
                const totalMins = (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0);
                return (
                  <div key={loc.id} className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{loc.name}</p>
                      {loc.address && (
                        <p className="text-xs text-text-muted truncate">{loc.address}</p>
                      )}
                    </div>
                    {totalMins > 0 && (
                      <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5 shrink-0">
                        {fmtMins(totalMins)}
                      </span>
                    )}
                    {(loc.scenes?.length || 0) > 0 && (
                      <span className="text-xs text-text-muted flex items-center gap-0.5 shrink-0">
                        <FilmIcon className="w-3 h-3" />{loc.scenes!.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
