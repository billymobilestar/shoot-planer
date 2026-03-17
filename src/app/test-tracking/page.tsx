"use client";

import { useState, useRef, useCallback } from "react";
import { MapPin, Navigation, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";

interface SelectedPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

const ARRIVAL_THRESHOLD_METERS = 150;

export default function TestTrackingPage() {
  const [addressValue, setAddressValue] = useState("");
  const [place, setPlace] = useState<SelectedPlace | null>(null);

  const [tracking, setTracking] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);

  function handlePlaceSelect(result: { address: string; latitude: number; longitude: number; name?: string }) {
    setPlace({
      name: result.name || result.address.split(",")[0],
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setDistance(null);
    setArrived(false);
    setError(null);
    setCheckCount(0);
  }

  function clearPlace() {
    setPlace(null);
    setAddressValue("");
    setDistance(null);
    setArrived(false);
    stopTracking();
  }

  const updatePosition = useCallback(
    (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserLat(lat);
      setUserLng(lng);
      setAccuracy(pos.coords.accuracy);
      setError(null);
      setCheckCount((c) => c + 1);

      if (place) {
        const d = haversineMeters(lat, lng, place.latitude, place.longitude);
        setDistance(d);
        setArrived(d <= ARRIVAL_THRESHOLD_METERS);
      }
    },
    [place]
  );

  function checkOnce() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      updatePosition,
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setError(null);
    setTracking(true);
    setCheckCount(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Location Tracking Test</h1>
          <p className="text-text-secondary text-sm mt-1">
            Pick a location, then check how far you are from it.
          </p>
        </div>

        {/* Location picker */}
        <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
          <label className="text-sm font-medium text-text-primary block">Target Location</label>

          {place ? (
            <div className="flex items-start gap-3 bg-bg-primary rounded-lg border border-border p-4">
              <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{place.name}</p>
                <p className="text-sm text-text-secondary truncate">{place.address}</p>
                <p className="text-xs text-text-muted mt-1">
                  {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                </p>
              </div>
              <button onClick={clearPlace} className="text-text-muted hover:text-text-primary shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <AddressAutocomplete
              value={addressValue}
              onChange={setAddressValue}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Type a location to search..."
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          )}
        </div>

        {/* Controls */}
        {place && (
          <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
            <label className="text-sm font-medium text-text-primary block">Distance Check</label>

            <div className="flex gap-3">
              <button
                onClick={checkOnce}
                disabled={tracking}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Check Once
              </button>

              {!tracking ? (
                <button
                  onClick={startTracking}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent text-white hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Live Track
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg text-sm font-medium transition-colors"
                >
                  Stop
                </button>
              )}
            </div>

            {tracking && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                Live tracking active &middot; {checkCount} update{checkCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-danger/5 border border-danger/20 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">Location Error</p>
              <p className="text-xs text-text-secondary mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {distance !== null && place && (
          <div
            className={`rounded-xl border-2 p-6 text-center space-y-3 transition-colors ${
              arrived
                ? "border-success bg-success/5"
                : "border-border bg-bg-card"
            }`}
          >
            {arrived ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
                <p className="text-2xl font-bold text-success">You have arrived!</p>
                <p className="text-sm text-text-secondary">
                  Within {ARRIVAL_THRESHOLD_METERS}m of <span className="font-medium">{place.name}</span>
                </p>
              </>
            ) : (
              <>
                <Navigation className="w-12 h-12 text-accent mx-auto" />
                <p className="text-4xl font-bold text-text-primary">{formatDistance(distance)}</p>
                <p className="text-sm text-text-secondary">
                  away from <span className="font-medium">{place.name}</span>
                </p>
              </>
            )}

            {/* Debug info */}
            <div className="pt-3 border-t border-border space-y-1 text-left">
              <p className="text-[11px] text-text-muted font-mono">
                You: {userLat?.toFixed(6)}, {userLng?.toFixed(6)}
              </p>
              <p className="text-[11px] text-text-muted font-mono">
                Target: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
              </p>
              <p className="text-[11px] text-text-muted font-mono">
                Accuracy: &plusmn;{accuracy ? `${Math.round(accuracy)}m` : "\u2014"}
              </p>
              <p className="text-[11px] text-text-muted font-mono">
                Threshold: {ARRIVAL_THRESHOLD_METERS}m
              </p>
              <p className="text-[11px] text-text-muted font-mono">
                Raw distance: {Math.round(distance)}m
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
