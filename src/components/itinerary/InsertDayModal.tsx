"use client";

import { useState } from "react";
import { AlertTriangle, Plus, X, CalendarDays } from "lucide-react";

interface Props {
  afterDayNumber: number;
  totalDays: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function InsertDayModal({ afterDayNumber, totalDays, onConfirm, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const daysAfter = totalDays - afterDayNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-lg">Insert a new day?</h3>
            <p className="text-text-secondary text-sm mt-0.5">
              This will add a day between Day {afterDayNumber} and Day {afterDayNumber + 1}.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning */}
        {daysAfter > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-start gap-2.5 bg-warning/5 border border-warning/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">
                {daysAfter === 1
                  ? "Day after this will shift forward by one."
                  : `${daysAfter} days after this will shift forward by one.`}
                {" "}All dates in your schedule will update accordingly.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => {
              if (confirming) {
                onConfirm();
              } else {
                setConfirming(true);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${
              confirming
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-accent/10 text-accent hover:bg-accent/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {confirming ? "Click again to confirm" : "Insert day & shift schedule"}
          </button>

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
