"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Eraser, X, MapPin } from "lucide-react";
import { ShootDayWithLocations } from "@/lib/types";

interface Props {
  day: ShootDayWithLocations;
  totalDays: number;
  onDeleteAndShift: () => void;
  onClearDay: () => void;
  onClose: () => void;
}

export default function DeleteDayModal({ day, totalDays, onDeleteAndShift, onClearDay, onClose }: Props) {
  const [confirming, setConfirming] = useState<"shift" | "clear" | null>(null);
  const daysAfter = totalDays - day.day_number;
  const label = day.title || `Day ${day.day_number}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-lg">Remove &ldquo;{label}&rdquo;?</h3>
            <p className="text-text-secondary text-sm mt-0.5">
              This day has {day.locations.length} {day.locations.length === 1 ? "location" : "locations"}.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location preview */}
        {day.locations.length > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-bg-primary rounded-lg border border-border p-3 space-y-1.5">
              {day.locations.slice(0, 3).map((loc) => (
                <div key={loc.id} className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </div>
              ))}
              {day.locations.length > 3 && (
                <p className="text-xs text-text-muted pl-5">+{day.locations.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="px-6 pb-6 space-y-3">
          {/* Option 1: Delete & Shift */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => {
                if (confirming === "shift") {
                  onDeleteAndShift();
                } else {
                  setConfirming("shift");
                }
              }}
              className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                confirming === "shift" ? "bg-danger/5" : "hover:bg-bg-card-hover"
              }`}
            >
              <Trash2 className={`w-5 h-5 mt-0.5 shrink-0 ${confirming === "shift" ? "text-danger" : "text-text-secondary"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${confirming === "shift" ? "text-danger" : "text-text-primary"}`}>
                  {confirming === "shift" ? "Click again to confirm" : "Delete & shift schedule"}
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  Removes this day and all its locations.
                  {daysAfter > 0 && ` Day${daysAfter > 1 ? "s" : ""} after will shift ${daysAfter > 1 ? "up" : ""} by one.`}
                </p>
              </div>
            </button>
          </div>

          {/* Option 2: Clear Day */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => {
                if (confirming === "clear") {
                  onClearDay();
                } else {
                  setConfirming("clear");
                }
              }}
              className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                confirming === "clear" ? "bg-warning/5" : "hover:bg-bg-card-hover"
              }`}
            >
              <Eraser className={`w-5 h-5 mt-0.5 shrink-0 ${confirming === "clear" ? "text-warning" : "text-text-secondary"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${confirming === "clear" ? "text-warning" : "text-text-primary"}`}>
                  {confirming === "clear" ? "Click again to confirm" : "Clear day (keep slot)"}
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  Removes all locations but keeps the day in the schedule. No dates shift.
                </p>
              </div>
            </button>
          </div>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
