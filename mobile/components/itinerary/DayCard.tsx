import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShootDayWithLocations, Location } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import LocationCard from "./LocationCard";
import DriveConnector from "./DriveConnector";
import AddLocationModal from "./AddLocationModal";

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

interface Props {
  day: ShootDayWithLocations;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  onRequestDelete?: () => void;
  onShiftUp?: () => void;
  onShiftDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dayDate?: string | null;
  onInsertAfter?: () => void;
}

export default function DayCard({
  day,
  canEdit,
  projectId,
  onUpdate,
  onRequestDelete,
  onShiftUp,
  onShiftDown,
  isFirst,
  isLast,
  dayDate,
  onInsertAfter,
}: Props) {
  const { request } = useApi();
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(day.title || `Day ${day.day_number}`);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [insertAtPosition, setInsertAtPosition] = useState<number | null>(null);

  // Stats
  const filmingMinutes = day.locations.reduce((sum, loc) => {
    const sceneDuration = (loc.scenes || []).reduce((s, sc) => s + (sc.duration_minutes || 0), 0);
    const shootTime = sceneDuration > 0 ? sceneDuration : (loc.shoot_minutes || 0);
    return sum + (loc.prep_minutes || 0) + shootTime + (loc.wrap_minutes || 0);
  }, 0);
  const drivingMinutes = day.locations.reduce((sum, loc) => sum + parseDriveMinutes(loc.drive_time_from_previous), 0);
  const breakMinutes = day.locations.reduce((sum, loc) => sum + (loc.break_after_minutes || 0), 0);
  const totalMinutes = filmingMinutes + drivingMinutes + breakMinutes;
  const isOT = totalMinutes > 720;

  const locCount = day.locations.length;
  const completedCount = day.locations.filter((l) => l.completed).length;
  const progressPct = locCount > 0 ? Math.round((completedCount / locCount) * 100) : 0;
  const dayComplete = locCount > 0 && completedCount === locCount;

  const displayDate = dayDate || day.date;

  async function saveTitle() {
    try {
      await request(`/api/projects/${projectId}/days/${day.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: titleValue.trim() }),
      });
      setEditingTitle(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteLocation(id: string) {
    await request(`/api/projects/${projectId}/locations/${id}`, { method: "DELETE" });
    onUpdate();
  }

  function confirmDeleteDay() {
    Alert.alert(
      `Delete ${day.title || `Day ${day.day_number}`}?`,
      locCount > 0
        ? `This will delete ${locCount} location${locCount > 1 ? "s" : ""} and shift all following days up.`
        : "All following days will shift up.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onRequestDelete?.() },
      ]
    );
  }

  return (
    <View className={`bg-bg-card border rounded-2xl overflow-hidden ${isOT ? "border-warning/30" : "border-border"}`}>
      {/* Header */}
      <TouchableOpacity
        className="bg-bg-card-hover px-4 py-4 flex-row items-center justify-between"
        onPress={() => !editingTitle && setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        {/* Left: day badge + info */}
        <View className="flex-row items-center gap-3 flex-1 min-w-0">
          <View className={`w-12 h-12 rounded-xl items-center justify-center shrink-0 ${dayComplete ? "bg-success/10" : "bg-accent/10"}`}>
            <Text className={`font-bold text-lg leading-none ${dayComplete ? "text-success" : "text-accent"}`}>
              {day.day_number}
            </Text>
            <Text className={`text-[9px] uppercase tracking-wider ${dayComplete ? "text-success/60" : "text-accent/60"}`}>
              Day
            </Text>
          </View>

          {editingTitle ? (
            <View className="flex-row items-center gap-2 flex-1">
              <TextInput
                className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-text-primary text-base"
                value={titleValue}
                onChangeText={setTitleValue}
                autoFocus
                onSubmitEditing={saveTitle}
                onBlur={saveTitle}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveTitle}>
                <Ionicons name="checkmark" size={18} color="#7cc49a" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingTitle(false); setTitleValue(day.title || `Day ${day.day_number}`); }}>
                <Ionicons name="close" size={18} color="#6b6560" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold text-text-primary text-base" numberOfLines={1}>
                  {day.title || `Day ${day.day_number}`}
                </Text>
                {canEdit && (
                  <TouchableOpacity
                    onPress={(e) => { setTitleValue(day.title || `Day ${day.day_number}`); setEditingTitle(true); }}
                  >
                    <Ionicons name="pencil-outline" size={13} color="#6b6560" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {displayDate ? (
                  <Text className="text-text-secondary text-xs">
                    {new Date(displayDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location-outline" size={10} color="#6b6560" />
                  <Text className="text-text-muted text-xs">{locCount} {locCount === 1 ? "loc" : "locs"}</Text>
                </View>
                {filmingMinutes > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="film-outline" size={10} color="#6b6560" />
                    <Text className="text-text-muted text-xs">{fmtMins(filmingMinutes)}</Text>
                  </View>
                )}
                {drivingMinutes > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="car-outline" size={10} color="#6b6560" />
                    <Text className="text-text-muted text-xs">{fmtMins(drivingMinutes)}</Text>
                  </View>
                )}
                {totalMinutes > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time-outline" size={10} color={isOT ? "#e8b84a" : "#6b6560"} />
                    <Text className={`text-xs font-medium ${isOT ? "text-warning" : "text-text-muted"}`}>
                      {fmtMins(totalMinutes)}{isOT ? " ⚠" : ""}
                    </Text>
                  </View>
                )}
              </View>

              {isOT && (
                <Text className="text-warning text-xs mt-0.5">
                  Exceeds 12h — crew OT may apply
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Right: actions */}
        <View className="flex-row items-center gap-2 shrink-0 ml-2">
          {canEdit && (
            <View className="flex-row items-center gap-0.5 bg-bg-input border border-border rounded-lg px-1 py-0.5">
              <TouchableOpacity
                onPress={onShiftUp}
                disabled={isFirst}
                className="p-1"
                style={{ opacity: isFirst ? 0.25 : 1 }}
              >
                <Ionicons name="arrow-up" size={13} color="#9a928a" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onShiftDown}
                disabled={isLast}
                className="p-1"
                style={{ opacity: isLast ? 0.25 : 1 }}
              >
                <Ionicons name="arrow-down" size={13} color="#9a928a" />
              </TouchableOpacity>
            </View>
          )}
          {canEdit && onRequestDelete && (
            <TouchableOpacity onPress={confirmDeleteDay}>
              <Ionicons name="trash-outline" size={16} color="#6b6560" />
            </TouchableOpacity>
          )}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#6b6560" />
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      {locCount > 0 && (
        <View className="px-4 py-2 flex-row items-center gap-3 border-t border-border bg-bg-card">
          <View className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${dayComplete ? "bg-success" : "bg-accent"}`}
              style={{ width: `${progressPct}%` }}
            />
          </View>
          <Text className={`text-xs font-medium ${dayComplete ? "text-success" : "text-text-muted"}`}>
            {completedCount}/{locCount}
          </Text>
        </View>
      )}

      {/* Locations */}
      {expanded && (
        <View className="p-4 gap-0">
          {day.locations.map((location, idx) => (
            <View key={location.id}>
              {idx > 0 && (
                <View className="relative">
                  <DriveConnector
                    driveTime={location.drive_time_from_previous}
                    driveDistance={location.drive_distance_from_previous}
                    originLat={day.locations[idx - 1].latitude}
                    originLng={day.locations[idx - 1].longitude}
                    destLat={location.latitude}
                    destLng={location.longitude}
                  />
                  {canEdit && (
                    <TouchableOpacity
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex-row items-center gap-1 bg-accent rounded-full px-2.5 py-1"
                      style={{ transform: [{ translateY: -12 }] }}
                      onPress={() => { setInsertAtPosition(idx); setShowAddLocation(true); }}
                    >
                      <Ionicons name="add" size={12} color="#fff" />
                      <Text className="text-white text-[10px] font-medium">Insert</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <LocationCard
                location={location}
                canEdit={canEdit}
                projectId={projectId}
                onUpdate={onUpdate}
                onRequestDelete={() => deleteLocation(location.id)}
              />

              {(location.break_after_minutes || 0) > 0 && (
                <View className="flex-row items-center justify-center gap-2 py-2">
                  <Ionicons name="cafe-outline" size={13} color="#c87040" style={{ opacity: 0.6 }} />
                  <Text className="text-text-muted text-xs">Break · {fmtMins(location.break_after_minutes)}</Text>
                </View>
              )}
            </View>
          ))}

          {locCount === 0 && (
            <View className="py-10 items-center border border-dashed border-border rounded-2xl">
              <Text className="text-text-muted text-sm">
                No locations yet.{canEdit ? " Add one below." : ""}
              </Text>
            </View>
          )}

          {canEdit && (
            <TouchableOpacity
              className="mt-3 flex-row items-center justify-center gap-2 py-3 border border-dashed border-border rounded-2xl"
              onPress={() => { setInsertAtPosition(null); setShowAddLocation(true); }}
            >
              <Ionicons name="add" size={16} color="#9a928a" />
              <Text className="text-text-secondary text-sm">Add Location</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showAddLocation && (
        <AddLocationModal
          projectId={projectId}
          shootDayId={day.id}
          position={insertAtPosition ?? locCount}
          onCreated={onUpdate}
          onClose={() => { setShowAddLocation(false); setInsertAtPosition(null); }}
        />
      )}
    </View>
  );
}
