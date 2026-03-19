"use client";

import { useState, useEffect } from "react";
import { X, Home, MapPin, Navigation, Loader2 } from "lucide-react";
import { generateGoogleMapsUrl } from "@/lib/utils";
import { UserSettings } from "@/lib/types";
import AddressAutocomplete from "../AddressAutocomplete";

interface LocationPoint {
  latitude: number | null;
  longitude: number | null;
  name: string;
}

interface Props {
  locations: LocationPoint[];
  label?: string;
  onClose: () => void;
}

export default function MapsRouteModal({ locations, label, onClose }: Props) {
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetHome, setShowSetHome] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingHome, setSavingHome] = useState(false);

  useEffect(() => {
    fetch("/api/user-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserSettings | null) => {
        if (data?.home_address) {
          setHomeAddress(data.home_address);
          setHomeLat(data.home_latitude);
          setHomeLng(data.home_longitude);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function openMaps(fromHome: boolean) {
    let routeLocations = [...locations];
    if (fromHome && homeLat && homeLng) {
      routeLocations = [{ latitude: homeLat, longitude: homeLng, name: "Home" }, ...routeLocations];
    }
    const url = generateGoogleMapsUrl(routeLocations);
    window.open(url, "_blank");
    onClose();
  }

  async function saveHomeAndOpen() {
    if (!homeLat || !homeLng) return;
    setSavingHome(true);
    await fetch("/api/user-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_address: addressInput || homeAddress,
        home_latitude: homeLat,
        home_longitude: homeLng,
      }),
    });
    setSavingHome(false);
    openMaps(true);
  }

  const validLocations = locations.filter((l) => l.latitude && l.longitude);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">
            View in Maps
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {label && (
          <p className="text-sm text-text-secondary mb-4">{label} · {validLocations.length} location{validLocations.length !== 1 ? "s" : ""}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        ) : showSetHome ? (
          /* Set home address form */
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Set your home address to include it as the starting point.</p>
            <AddressAutocomplete
              value={addressInput}
              onChange={setAddressInput}
              onPlaceSelect={(place) => {
                setAddressInput(place.address);
                setHomeLat(place.latitude);
                setHomeLng(place.longitude);
                setHomeAddress(place.address);
              }}
              placeholder="Search your home address..."
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSetHome(false)}
                className="flex-1 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                Back
              </button>
              <button
                onClick={saveHomeAndOpen}
                disabled={!homeLat || !homeLng || savingHome}
                className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {savingHome ? "Saving..." : "Save & Open Maps"}
              </button>
            </div>
          </div>
        ) : (
          /* Route options */
          <div className="space-y-3">
            {/* Option 1: Start from home */}
            <button
              onClick={() => {
                if (homeAddress && homeLat && homeLng) {
                  openMaps(true);
                } else {
                  setShowSetHome(true);
                }
              }}
              className="w-full flex items-center gap-3 p-4 bg-bg-primary border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">Start from home</p>
                {homeAddress ? (
                  <p className="text-xs text-text-muted truncate mt-0.5">{homeAddress}</p>
                ) : (
                  <p className="text-xs text-text-muted mt-0.5">Set your home address</p>
                )}
              </div>
              <Navigation className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0" />
            </button>

            {/* Option 2: Start from first location */}
            <button
              onClick={() => openMaps(false)}
              className="w-full flex items-center gap-3 p-4 bg-bg-primary border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">Start from first location</p>
                {validLocations[0] && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{validLocations[0].name}</p>
                )}
              </div>
              <Navigation className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0" />
            </button>

            {/* Change home address link */}
            {homeAddress && (
              <button
                onClick={() => { setShowSetHome(true); setAddressInput(homeAddress); }}
                className="w-full text-center text-xs text-text-muted hover:text-accent transition-colors pt-1"
              >
                Change home address
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
