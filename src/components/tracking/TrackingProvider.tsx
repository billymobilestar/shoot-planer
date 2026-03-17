"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useGeolocation, GeoPosition, haversineMeters } from "@/hooks/useGeolocation";
import { Location } from "@/lib/types";

const ARRIVAL_THRESHOLD_METERS = 150;

interface ArrivalEvent {
  location: Location;
  distance: number;
  timestamp: number;
}

interface TrackingContextValue {
  // State
  active: boolean;
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  nearestLocation: { location: Location; distance: number } | null;
  arrivals: ArrivalEvent[];
  dismissedArrivals: Set<string>; // location IDs the user dismissed

  // Actions
  start: () => void;
  stop: () => void;
  checkOnce: () => void;
  setLocations: (locations: Location[]) => void;
  dismissArrival: (locationId: string) => void;
  getDistanceTo: (lat: number | null, lng: number | null) => number | null;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within TrackingProvider");
  return ctx;
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation({ intervalMs: 30000 });
  const [locations, setLocations] = useState<Location[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalEvent[]>([]);
  const [dismissedArrivals, setDismissedArrivals] = useState<Set<string>>(new Set());
  const prevArrivedIds = useRef<Set<string>>(new Set());

  // Compute distances and detect arrivals
  const locationsWithDistance = locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      location: l,
      distance: geo.position
        ? haversineMeters(geo.position.latitude, geo.position.longitude, l.latitude!, l.longitude!)
        : Infinity,
    }));

  const nearestLocation = locationsWithDistance.length > 0 && geo.position
    ? locationsWithDistance.reduce((best, curr) => (curr.distance < best.distance ? curr : best))
    : null;

  // Detect new arrivals
  useEffect(() => {
    if (!geo.position) return;

    const nowArrivedIds = new Set<string>();
    for (const { location, distance } of locationsWithDistance) {
      if (distance <= ARRIVAL_THRESHOLD_METERS) {
        nowArrivedIds.add(location.id);

        // Only fire arrival event for newly arrived locations
        if (!prevArrivedIds.current.has(location.id)) {
          setArrivals((prev) => {
            // Don't duplicate
            if (prev.some((a) => a.location.id === location.id)) return prev;
            return [...prev, { location, distance, timestamp: Date.now() }];
          });
        }
      }
    }

    prevArrivedIds.current = nowArrivedIds;
  }, [geo.position, locationsWithDistance]);

  const dismissArrival = useCallback((locationId: string) => {
    setDismissedArrivals((prev) => new Set(prev).add(locationId));
    setArrivals((prev) => prev.filter((a) => a.location.id !== locationId));
  }, []);

  const getDistanceTo = useCallback(
    (lat: number | null, lng: number | null) => {
      if (!geo.position || lat == null || lng == null) return null;
      return haversineMeters(geo.position.latitude, geo.position.longitude, lat, lng);
    },
    [geo.position]
  );

  return (
    <TrackingContext.Provider
      value={{
        active: geo.active,
        position: geo.position,
        error: geo.error,
        loading: geo.loading,
        nearestLocation,
        arrivals,
        dismissedArrivals,
        start: geo.start,
        stop: geo.stop,
        checkOnce: geo.checkOnce,
        setLocations,
        dismissArrival,
        getDistanceTo,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}
