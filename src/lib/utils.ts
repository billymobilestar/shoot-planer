export function generateGoogleMapsUrl(
  locations: { latitude: number | null; longitude: number | null; name: string }[]
): string {
  const validLocations = locations.filter((l) => l.latitude && l.longitude);
  if (validLocations.length === 0) return "https://maps.google.com";

  if (validLocations.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${validLocations[0].latitude},${validLocations[0].longitude}`;
  }

  const origin = validLocations[0];
  const destination = validLocations[validLocations.length - 1];
  const waypoints = validLocations.slice(1, -1);

  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${origin.latitude},${origin.longitude}`;
  url += `&destination=${destination.latitude},${destination.longitude}`;

  if (waypoints.length > 0) {
    const waypointStr = waypoints
      .map((w) => `${w.latitude},${w.longitude}`)
      .join("|");
    url += `&waypoints=${encodeURIComponent(waypointStr)}`;
  }

  url += `&travelmode=driving`;
  return url;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Resolve a display name from a Clerk user object */
export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  emailAddresses?: { emailAddress: string }[];
} | null): string {
  if (!user) return "Unknown";
  if (user.fullName) return user.fullName;
  if (user.firstName) return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`;
  if (user.username) return user.username;
  if (user.emailAddresses?.[0]?.emailAddress) {
    const email = user.emailAddresses[0].emailAddress;
    return email.split("@")[0];
  }
  return "Unknown";
}
