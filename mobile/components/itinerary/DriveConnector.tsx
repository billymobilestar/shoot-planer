import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface Props {
  driveTime?: string | null;
  driveDistance?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}

export default function DriveConnector({
  driveTime,
  driveDistance,
  originLat,
  originLng,
  destLat,
  destLng,
}: Props) {
  const [time, setTime] = useState(driveTime || null);
  const [distance, setDistance] = useState(driveDistance || null);
  const [loading, setLoading] = useState(false);

  const coordKey = `${originLat},${originLng}->${destLat},${destLng}`;
  const [lastCoordKey, setLastCoordKey] = useState(coordKey);

  useEffect(() => {
    if (coordKey !== lastCoordKey) {
      setTime(null);
      setDistance(null);
      setLastCoordKey(coordKey);
    }
  }, [coordKey, lastCoordKey]);

  useEffect(() => {
    if (time || distance) return;
    if (!originLat || !originLng || !destLat || !destLng) return;

    let cancelled = false;
    setLoading(true);

    fetch(
      `${BASE_URL}/api/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTime(data.duration);
        setDistance(data.distance);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [originLat, originLng, destLat, destLng, time, distance]);

  if (loading) {
    return (
      <View className="items-center py-2 gap-1">
        <View className="w-px h-3 bg-border-light" />
        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border">
          <ActivityIndicator size="small" color="#6b6560" />
          <Text className="text-text-muted text-xs">Calculating...</Text>
        </View>
        <View className="w-px h-3 bg-border-light" />
      </View>
    );
  }

  if (!time && !distance) {
    return (
      <View className="items-center py-1.5">
        <View className="w-px h-5 bg-border-light" />
      </View>
    );
  }

  return (
    <View className="items-center py-2 gap-1">
      <View className="w-px h-3 bg-border-light" />
      <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border">
        <Ionicons name="car-outline" size={11} color="#6b6560" />
        {time && <Text className="text-text-secondary text-xs">{time}</Text>}
        {distance && <Text className="text-text-muted text-xs">{distance}</Text>}
      </View>
      <View className="w-px h-3 bg-border-light" />
    </View>
  );
}
