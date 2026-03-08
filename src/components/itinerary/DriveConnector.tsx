"use client";

import { useEffect, useState } from "react";
import { Car, Loader2 } from "lucide-react";

interface Props {
  driveTime?: string | null;
  driveDistance?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  locationId?: string;
  projectId?: string;
}

export default function DriveConnector({
  driveTime,
  driveDistance,
  originLat,
  originLng,
  destLat,
  destLng,
  locationId,
  projectId,
}: Props) {
  const [time, setTime] = useState(driveTime || null);
  const [distance, setDistance] = useState(driveDistance || null);
  const [loading, setLoading] = useState(false);

  // Build a coordinate key to detect when origin/dest pair changes (e.g. after reorder)
  const coordKey = `${originLat},${originLng}->${destLat},${destLng}`;
  const [lastCoordKey, setLastCoordKey] = useState(coordKey);

  // Reset cached data when coordinates change (reorder happened)
  useEffect(() => {
    if (coordKey !== lastCoordKey) {
      setTime(null);
      setDistance(null);
      setLastCoordKey(coordKey);
    }
  }, [coordKey, lastCoordKey]);

  useEffect(() => {
    // If we already have data or don't have both coordinate pairs, skip
    if (time || distance) return;
    if (!originLat || !originLng || !destLat || !destLng) return;

    let cancelled = false;
    setLoading(true);

    fetch(
      `/api/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTime(data.duration);
        setDistance(data.distance);

        // Persist to the location record
        if (locationId && projectId) {
          fetch(`/api/projects/${projectId}/locations/${locationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              drive_time_from_previous: data.duration,
              drive_distance_from_previous: data.distance,
            }),
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originLat, originLng, destLat, destLng, time, distance, locationId, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5">
        <div className="w-px h-4 bg-border-light" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border text-xs">
          <Loader2 className="w-3 h-3 text-text-muted animate-spin" />
          <span className="text-text-muted">Calculating...</span>
        </div>
        <div className="w-px h-4 bg-border-light" />
      </div>
    );
  }

  if (!time && !distance) {
    return (
      <div className="flex justify-center py-1">
        <div className="w-px h-6 bg-border-light" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-1.5">
      <div className="w-px h-4 bg-border-light" />
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border text-xs">
        <Car className="w-3 h-3 text-text-muted" />
        {time && <span className="text-text-secondary">{time}</span>}
        {distance && <span className="text-text-muted">{distance}</span>}
      </div>
      <div className="w-px h-4 bg-border-light" />
    </div>
  );
}
