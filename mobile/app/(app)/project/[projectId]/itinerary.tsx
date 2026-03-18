import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/hooks/useApi";
import DayCard from "@/components/itinerary/DayCard";
import DriveConnector from "@/components/itinerary/DriveConnector";
import type { ShootDayWithLocations, ProjectWithRole } from "@/lib/types";

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

function generateMapsUrl(locations: { latitude: number | null; longitude: number | null }[]): string | null {
  const coords = locations.filter((l) => l.latitude && l.longitude);
  if (coords.length === 0) return null;
  if (coords.length === 1) {
    return `https://maps.apple.com/?q=${coords[0].latitude},${coords[0].longitude}`;
  }
  const waypoints = coords.map((c) => `${c.latitude},${c.longitude}`).join("/");
  return `https://maps.apple.com/?daddr=${waypoints}`;
}

export default function ItineraryTab() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { request } = useApi();
  const router = useRouter();

  const [days, setDays] = useState<ShootDayWithLocations[]>([]);
  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insertAfterDayNumber, setInsertAfterDayNumber] = useState<number | null>(null);
  const [showInsertModal, setShowInsertModal] = useState(false);

  const canEdit = project ? project.role === "owner" || project.role === "admin" : false;

  const fetchData = useCallback(async () => {
    try {
      const [daysData, projectData] = await Promise.all([
        request(`/api/projects/${projectId}/days`),
        request(`/api/projects/${projectId}`),
      ]);
      setDays(daysData);
      setProject(projectData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, request]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addDay() {
    try {
      await request(`/api/projects/${projectId}/days`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteDay(dayId: string) {
    try {
      await request(`/api/projects/${projectId}/days/${dayId}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function shiftDay(dayNumber: number, direction: "up" | "down") {
    const idx = days.findIndex((d) => d.day_number === dayNumber);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= days.length) return;

    const current = days[idx];
    const neighbor = days[neighborIdx];

    try {
      await request(`/api/projects/${projectId}/days/reorder`, {
        method: "POST",
        body: JSON.stringify({
          updates: [
            { id: current.id, day_number: neighbor.day_number },
            { id: neighbor.id, day_number: current.day_number },
          ],
        }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function insertDay(afterDayNumber: number) {
    try {
      await request(`/api/projects/${projectId}/days`, {
        method: "POST",
        body: JSON.stringify({ insert_after_day_number: afterDayNumber }),
      });
      setShowInsertModal(false);
      setInsertAfterDayNumber(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  // Stats
  const allLocations = days.flatMap((d) => d.locations);
  const totalFilmingMinutes = allLocations.reduce((sum, loc) => {
    const sceneDuration = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
    const shootTime = sceneDuration > 0 ? sceneDuration : (loc.shoot_minutes || 0);
    return sum + (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0);
  }, 0);
  const totalDrivingMinutes = allLocations.reduce((sum, loc) => sum + parseDriveMinutes(loc.drive_time_from_previous), 0);
  const totalBreakMinutes = allLocations.reduce((sum, loc) => sum + (loc.break_after_minutes || 0), 0);
  const grandTotalMinutes = totalFilmingMinutes + totalDrivingMinutes + totalBreakMinutes;
  const mapsUrl = generateMapsUrl(allLocations);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#c87040" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#9a928a" />
          </TouchableOpacity>
          <View>
            <Text className="text-text-primary font-semibold text-base" numberOfLines={1}>
              {project?.name || "Itinerary"}
            </Text>
            <Text className="text-text-muted text-xs">Itinerary</Text>
          </View>
        </View>
        {mapsUrl && (
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-accent rounded-xl px-3 py-2"
            onPress={() => Linking.openURL(mapsUrl)}
          >
            <Ionicons name="navigate" size={14} color="#fff" />
            <Text className="text-white text-xs font-medium">Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#c87040" />
        }
      >
        {/* Stats bar */}
        <View className="bg-bg-card border border-border rounded-2xl p-4 mb-4 flex-row flex-wrap gap-x-4 gap-y-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color="#c87040" />
            <Text className="text-text-primary font-medium text-sm">{days.length}</Text>
            <Text className="text-text-secondary text-sm">days</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={14} color="#c87040" />
            <Text className="text-text-primary font-medium text-sm">{allLocations.length}</Text>
            <Text className="text-text-secondary text-sm">locations</Text>
          </View>
          {totalFilmingMinutes > 0 && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="film-outline" size={14} color="#c87040" />
              <Text className="text-text-primary font-medium text-sm">{fmtMins(totalFilmingMinutes)}</Text>
              <Text className="text-text-secondary text-sm">filming</Text>
            </View>
          )}
          {totalDrivingMinutes > 0 && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="car-outline" size={14} color="#c87040" />
              <Text className="text-text-primary font-medium text-sm">{fmtMins(totalDrivingMinutes)}</Text>
              <Text className="text-text-secondary text-sm">driving</Text>
            </View>
          )}
          {grandTotalMinutes > 0 && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={14} color="#c87040" />
              <Text className="text-text-primary font-medium text-sm">{fmtMins(grandTotalMinutes)}</Text>
              <Text className="text-text-secondary text-sm">total</Text>
            </View>
          )}
        </View>

        {/* Days list */}
        {days.map((day, dayIdx) => {
          const prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
          const prevLastLoc = prevDay?.locations?.[prevDay.locations.length - 1];
          const currFirstLoc = day.locations?.[0];
          const startDate = project?.start_date;
          const dayDate = startDate
            ? (() => {
                const d = new Date(startDate + "T00:00:00");
                d.setDate(d.getDate() + day.day_number - 1);
                return d.toISOString().slice(0, 10);
              })()
            : null;

          return (
            <View key={day.id}>
              {dayIdx > 0 && (
                <View className="relative">
                  {prevLastLoc && currFirstLoc ? (
                    <DriveConnector
                      originLat={prevLastLoc.latitude}
                      originLng={prevLastLoc.longitude}
                      destLat={currFirstLoc.latitude}
                      destLng={currFirstLoc.longitude}
                    />
                  ) : (
                    <View className="h-4" />
                  )}
                  {canEdit && (
                    <TouchableOpacity
                      className="absolute right-0 flex-row items-center gap-1 bg-accent rounded-full px-3 py-1.5 shadow-md"
                      style={{ top: "50%", transform: [{ translateY: -14 }] }}
                      onPress={() => { setInsertAfterDayNumber(prevDay!.day_number); setShowInsertModal(true); }}
                    >
                      <Ionicons name="add" size={13} color="#fff" />
                      <Text className="text-white text-xs font-medium">Insert Day</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <DayCard
                day={day}
                canEdit={canEdit}
                projectId={projectId}
                onUpdate={fetchData}
                onRequestDelete={() => deleteDay(day.id)}
                onShiftUp={() => shiftDay(day.day_number, "up")}
                onShiftDown={() => shiftDay(day.day_number, "down")}
                isFirst={dayIdx === 0}
                isLast={dayIdx === days.length - 1}
                dayDate={dayDate}
              />
            </View>
          );
        })}

        {/* Empty state */}
        {days.length === 0 && (
          <View className="items-center justify-center py-16">
            <Ionicons name="calendar-outline" size={48} color="#333333" />
            <Text className="text-text-muted text-base mt-4">No shoot days yet</Text>
          </View>
        )}

        {/* Add Day button */}
        {canEdit && (
          <TouchableOpacity
            className="mt-4 flex-row items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl"
            onPress={addDay}
          >
            <Ionicons name="add" size={20} color="#9a928a" />
            <Text className="text-text-secondary">Add Day</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Insert Day modal */}
      <Modal
        visible={showInsertModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInsertModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowInsertModal(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-bg-card border-t border-border rounded-t-3xl px-6 pt-5 pb-10">
              <View className="w-10 h-1 bg-border-light rounded-full self-center mb-5" />
              <Text className="text-text-primary font-semibold text-lg mb-2">Insert Day</Text>
              {insertAfterDayNumber !== null && (
                <Text className="text-text-secondary text-sm mb-5">
                  A new day will be inserted between Day {insertAfterDayNumber} and Day {insertAfterDayNumber + 1}.{"\n"}
                  All following days will shift forward by one.
                </Text>
              )}
              <TouchableOpacity
                className="bg-accent rounded-xl py-4 items-center"
                onPress={() => insertDay(insertAfterDayNumber!)}
              >
                <Text className="text-white font-semibold text-base">Insert Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="mt-3 py-3 items-center"
                onPress={() => setShowInsertModal(false)}
              >
                <Text className="text-text-secondary">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
