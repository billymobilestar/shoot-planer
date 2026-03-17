"use client";

import { Navigation, MapPin, CheckCircle2, X, Loader2 } from "lucide-react";
import { useTracking } from "./TrackingProvider";
import { formatDistance } from "@/hooks/useGeolocation";

interface Props {
  projectId: string;
  onMarkCompleted?: (locationId: string) => void;
}

export default function TrackingBanner({ projectId, onMarkCompleted }: Props) {
  const {
    active,
    position,
    loading,
    nearestLocation,
    arrivals,
    dismissedArrivals,
    dismissArrival,
  } = useTracking();

  if (!active) return null;

  // Show arrival alerts first (undismissed ones)
  const activeArrival = arrivals.find((a) => !dismissedArrivals.has(a.location.id));

  if (activeArrival) {
    return (
      <div className="mb-4 rounded-xl border-2 border-success bg-success/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-success text-sm">You&apos;ve arrived!</p>
            <p className="text-text-primary font-medium mt-0.5">{activeArrival.location.name}</p>
            {activeArrival.location.address && (
              <p className="text-text-muted text-xs mt-0.5 truncate">{activeArrival.location.address}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onMarkCompleted && !activeArrival.location.completed && (
              <button
                onClick={() => {
                  onMarkCompleted(activeArrival.location.id);
                  dismissArrival(activeArrival.location.id);
                }}
                className="flex items-center gap-1.5 bg-success hover:bg-success/80 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Done
              </button>
            )}
            <button
              onClick={() => dismissArrival(activeArrival.location.id)}
              className="text-text-muted hover:text-text-primary p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show nearest location status
  if (!position && loading) {
    return (
      <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
        <p className="text-sm text-text-secondary">Getting your location...</p>
      </div>
    );
  }

  if (nearestLocation) {
    return (
      <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3">
        <div className="flex items-center gap-3">
          <Navigation className="w-4 h-4 text-accent shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm text-text-secondary">Nearest:</span>
            <span className="text-sm font-medium text-text-primary truncate">{nearestLocation.location.name}</span>
          </div>
          <span className="text-sm font-bold text-accent shrink-0 tabular-nums">
            {formatDistance(nearestLocation.distance)}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
