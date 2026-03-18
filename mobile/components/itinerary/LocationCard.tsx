import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Location } from "@/lib/types";
import { useApi } from "@/hooks/useApi";

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function friendlyDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hr" : "hrs"}`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

interface Props {
  location: Location;
  canEdit: boolean;
  projectId: string;
  onUpdate: () => void;
  onRequestDelete?: () => void;
}

export default function LocationCard({ location, canEdit, projectId, onUpdate, onRequestDelete }: Props) {
  const { request } = useApi();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const [completed, setCompleted] = useState(location.completed || false);
  const [form, setForm] = useState({
    name: location.name,
    description: location.description || "",
    address: location.address || "",
    latitude: location.latitude?.toString() || "",
    longitude: location.longitude?.toString() || "",
    notes: location.notes || "",
  });
  const [timing, setTiming] = useState({
    prep: location.prep_minutes || 0,
    shoot: location.shoot_minutes || 0,
    wrap: location.wrap_minutes || 0,
    breakAfter: location.break_after_minutes || 0,
  });
  const [saving, setSaving] = useState(false);

  const scenes = location.scenes || [];
  const sceneCount = scenes.length;
  const totalSceneDuration = scenes.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalSceneMins = timing.prep + (totalSceneDuration || timing.shoot) + timing.wrap;
  const hasTiming = totalSceneMins > 0;

  const mapsUrl = location.latitude && location.longitude
    ? `https://maps.apple.com/?q=${location.latitude},${location.longitude}`
    : location.address
    ? `https://maps.apple.com/?q=${encodeURIComponent(location.address)}`
    : null;

  async function toggleCompleted() {
    const next = !completed;
    setCompleted(next);
    try {
      await request(`/api/projects/${projectId}/locations/${location.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: next }),
      });
      onUpdate();
    } catch {
      setCompleted(!next);
    }
  }

  async function saveTiming() {
    try {
      await request(`/api/projects/${projectId}/locations/${location.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          prep_minutes: timing.prep,
          shoot_minutes: timing.shoot,
          wrap_minutes: timing.wrap,
          break_after_minutes: timing.breakAfter,
        }),
      });
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await request(`/api/projects/${projectId}/locations/${location.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          address: form.address || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          notes: form.notes || null,
        }),
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Location",
      `Delete "${location.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onRequestDelete?.(),
        },
      ]
    );
  }

  return (
    <View className={`bg-bg-card-hover border rounded-2xl overflow-hidden ${completed ? "border-success/40" : "border-border"}`}>

      {/* Hero image */}
      {location.photo_url ? (
        <View className="relative">
          <Image
            source={{ uri: location.photo_url }}
            className="w-full"
            style={{ height: 200 }}
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/40" style={{ top: 120 }} />

          {/* Completion toggle on image */}
          <TouchableOpacity
            onPress={toggleCompleted}
            className="absolute top-3 left-3"
          >
            <Ionicons
              name={completed ? "checkmark-circle" : "ellipse-outline"}
              size={28}
              color={completed ? "#7cc49a" : "rgba(255,255,255,0.6)"}
            />
          </TouchableOpacity>

          {/* Name + info overlay */}
          <View className="absolute bottom-0 left-0 right-0 p-4">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className={`font-semibold text-white text-lg ${completed ? "line-through opacity-70" : ""}`}>
                {location.name}
              </Text>
            </View>
            {location.address ? (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text className="text-white/70 text-sm" numberOfLines={1}>{location.address}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1.5 mt-2">
              {hasTiming ? (
                <View className="flex-row items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <Text className="text-white text-xs font-bold">{fmtMins(totalSceneMins)}</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1 bg-yellow-500/20 rounded-full px-2.5 py-1">
                  <Ionicons name="time-outline" size={12} color="#e8b84a" />
                  <Text className="text-warning text-xs">No duration</Text>
                </View>
              )}
            </View>
          </View>

          {/* Toggle bar */}
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-2.5 bg-bg-card"
            onPress={() => setExpanded(!expanded)}
          >
            {mapsUrl ? (
              <TouchableOpacity
                className="flex-row items-center gap-1.5"
                onPress={() => Linking.openURL(mapsUrl)}
              >
                <Ionicons name="navigate-outline" size={13} color="#c87040" />
                <Text className="text-accent text-xs">Directions</Text>
              </TouchableOpacity>
            ) : <View />}
            <View className="flex-row items-center gap-1">
              <Text className="text-text-muted text-xs">{expanded ? "Less" : "More"}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#6b6560" />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        /* No image header */
        <TouchableOpacity
          className="flex-row items-center gap-3 p-4"
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          {/* Completion toggle */}
          <TouchableOpacity onPress={toggleCompleted}>
            <Ionicons
              name={completed ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={completed ? "#7cc49a" : "#6b6560"}
            />
          </TouchableOpacity>

          {/* Location icon */}
          <View className={`w-10 h-10 rounded-xl items-center justify-center shrink-0 ${completed ? "bg-success/10" : "bg-accent/10"}`}>
            <Ionicons name="location-outline" size={20} color={completed ? "#7cc49a" : "#c87040"} />
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text
                className={`font-semibold text-base ${completed ? "text-text-muted line-through" : "text-text-primary"}`}
                numberOfLines={1}
              >
                {location.name}
              </Text>
              {sceneCount > 0 && (
                <View className="flex-row items-center gap-1 bg-bg-card border border-border rounded-full px-2 py-0.5">
                  <Ionicons name="film-outline" size={10} color="#c87040" />
                  <Text className="text-text-secondary text-xs">{sceneCount}</Text>
                </View>
              )}
            </View>
            {location.address ? (
              <Text className="text-text-secondary text-sm mt-0.5" numberOfLines={1}>{location.address}</Text>
            ) : null}
            <View className="flex-row items-center gap-1.5 mt-1.5">
              {hasTiming ? (
                <View className="flex-row items-center gap-1 bg-accent/10 rounded-full px-2.5 py-1">
                  <Ionicons name="time-outline" size={11} color="#c87040" />
                  <Text className="text-accent text-xs font-bold">{fmtMins(totalSceneMins)}</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1 bg-warning/10 rounded-full px-2.5 py-1">
                  <Ionicons name="time-outline" size={11} color="#e8b84a" />
                  <Text className="text-warning text-xs">No duration</Text>
                </View>
              )}
            </View>
          </View>

          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#6b6560" />
        </TouchableOpacity>
      )}

      {/* Expanded details */}
      {expanded && (
        <View className="border-t border-border p-4 gap-4">

          {/* Duration banner */}
          {hasTiming && !showTimingEditor && (
            <TouchableOpacity
              className="rounded-2xl bg-accent/5 border border-accent/20 p-4"
              onPress={() => canEdit && setShowTimingEditor(true)}
              activeOpacity={canEdit ? 0.7 : 1}
            >
              <Text className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Shoot Duration</Text>
              <Text className="text-2xl font-bold text-text-primary mt-1">{friendlyDuration(totalSceneMins)}</Text>
              <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 mt-2">
                {timing.prep > 0 && (
                  <Text className="text-text-muted text-xs">Prep <Text className="text-text-secondary font-semibold">{fmtMins(timing.prep)}</Text></Text>
                )}
                {sceneCount > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="film-outline" size={11} color="#6b6560" />
                    <Text className="text-text-muted text-xs">{sceneCount} {sceneCount === 1 ? "scene" : "scenes"} <Text className="text-text-secondary font-semibold">{fmtMins(totalSceneDuration)}</Text></Text>
                  </View>
                ) : timing.shoot > 0 ? (
                  <Text className="text-text-muted text-xs">Shoot <Text className="text-text-secondary font-semibold">{fmtMins(timing.shoot)}</Text></Text>
                ) : null}
                {timing.wrap > 0 && (
                  <Text className="text-text-muted text-xs">Wrap <Text className="text-text-secondary font-semibold">{fmtMins(timing.wrap)}</Text></Text>
                )}
                {timing.breakAfter > 0 && (
                  <Text className="text-text-muted text-xs">Break <Text className="text-text-secondary font-semibold">{fmtMins(timing.breakAfter)}</Text></Text>
                )}
              </View>
              {canEdit && (
                <View className="flex-row items-center gap-1 mt-2">
                  <Ionicons name="pencil-outline" size={11} color="#6b6560" />
                  <Text className="text-text-muted text-xs">Tap to edit</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Timing editor */}
          {showTimingEditor && canEdit && (
            <View className="rounded-2xl border border-accent/30 bg-accent/5 p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-text-primary text-xs font-semibold uppercase tracking-wider">Shoot Duration</Text>
                <TouchableOpacity onPress={() => { setShowTimingEditor(false); saveTiming(); }}>
                  <Text className="text-accent text-sm font-medium">Done</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3">
                {(["prep", "shoot", "wrap"] as const).map((field) => (
                  <View key={field} className="flex-1">
                    <Text className="text-text-muted text-[10px] uppercase tracking-wider mb-1 capitalize">{field}</Text>
                    <View className="flex-row items-center gap-1">
                      <TextInput
                        className="flex-1 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm text-center"
                        value={Math.floor(timing[field] / 60) > 0 ? Math.floor(timing[field] / 60).toString() : ""}
                        onChangeText={(v) => setTiming((t) => ({ ...t, [field]: (parseInt(v) || 0) * 60 + (t[field] % 60) }))}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#6b6560"
                        onBlur={saveTiming}
                      />
                      <Text className="text-text-muted text-xs">h</Text>
                      <TextInput
                        className="flex-1 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm text-center"
                        value={(timing[field] % 60) > 0 ? (timing[field] % 60).toString() : ""}
                        onChangeText={(v) => setTiming((t) => ({ ...t, [field]: Math.floor(t[field] / 60) * 60 + Math.min(59, parseInt(v) || 0) }))}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#6b6560"
                        onBlur={saveTiming}
                      />
                      <Text className="text-text-muted text-xs">m</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Break after */}
              <View className="flex-row items-center gap-2 pt-2 border-t border-accent/10">
                <Ionicons name="cafe-outline" size={14} color="#6b6560" />
                <Text className="text-text-muted text-xs">Break after</Text>
                <View className="flex-row items-center gap-1 ml-auto">
                  <TextInput
                    className="w-12 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm text-center"
                    value={Math.floor(timing.breakAfter / 60) > 0 ? Math.floor(timing.breakAfter / 60).toString() : ""}
                    onChangeText={(v) => setTiming((t) => ({ ...t, breakAfter: (parseInt(v) || 0) * 60 + (t.breakAfter % 60) }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#6b6560"
                    onBlur={saveTiming}
                  />
                  <Text className="text-text-muted text-xs">h</Text>
                  <TextInput
                    className="w-12 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm text-center"
                    value={(timing.breakAfter % 60) > 0 ? (timing.breakAfter % 60).toString() : ""}
                    onChangeText={(v) => setTiming((t) => ({ ...t, breakAfter: Math.floor(t.breakAfter / 60) * 60 + Math.min(59, parseInt(v) || 0) }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#6b6560"
                    onBlur={saveTiming}
                  />
                  <Text className="text-text-muted text-xs">m</Text>
                </View>
              </View>
            </View>
          )}

          {/* Add duration prompt if no timing */}
          {!hasTiming && !showTimingEditor && canEdit && (
            <TouchableOpacity
              className="flex-row items-center gap-2 bg-accent/10 rounded-xl px-4 py-3"
              onPress={() => setShowTimingEditor(true)}
            >
              <Ionicons name="time-outline" size={16} color="#c87040" />
              <Text className="text-accent text-sm font-medium">Add Shoot Duration</Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          {location.description && !editing && (
            <Text className="text-text-secondary text-sm leading-relaxed">{location.description}</Text>
          )}

          {/* Address / Maps */}
          {!editing && (
            <View className="gap-2">
              {mapsUrl && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5"
                  onPress={() => Linking.openURL(mapsUrl)}
                >
                  <Ionicons name="navigate-outline" size={14} color="#c87040" />
                  <Text className="text-accent text-sm">View on Maps</Text>
                </TouchableOpacity>
              )}
              {location.latitude != null && location.longitude != null && (
                <Text className="text-text-muted text-xs">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              )}
              {location.notes ? (
                <View className="bg-bg-primary rounded-xl p-3 border border-border">
                  <Text className="text-text-secondary text-sm leading-relaxed">{location.notes}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Edit actions */}
          {canEdit && !editing && (
            <View className="flex-row items-center gap-3 flex-wrap pt-1">
              <TouchableOpacity
                className="flex-row items-center gap-1.5"
                onPress={() => setEditing(true)}
              >
                <Ionicons name="pencil-outline" size={14} color="#9a928a" />
                <Text className="text-text-secondary text-sm">Edit Details</Text>
              </TouchableOpacity>
              <View className="ml-auto">
                <TouchableOpacity onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={16} color="#e05252" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Edit form */}
          {editing && (
            <View className="gap-3">
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Location name"
                placeholderTextColor="#6b6560"
              />
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Description"
                placeholderTextColor="#6b6560"
                multiline
                style={{ minHeight: 60, textAlignVertical: "top" }}
              />
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="Address"
                placeholderTextColor="#6b6560"
              />
              <View className="flex-row gap-3">
                <TextInput
                  className="flex-1 bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  value={form.latitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, latitude: v }))}
                  placeholder="Latitude"
                  placeholderTextColor="#6b6560"
                  keyboardType="decimal-pad"
                />
                <TextInput
                  className="flex-1 bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  value={form.longitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, longitude: v }))}
                  placeholder="Longitude"
                  placeholderTextColor="#6b6560"
                  keyboardType="decimal-pad"
                />
              </View>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#6b6560"
                multiline
                style={{ minHeight: 60, textAlignVertical: "top" }}
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-accent rounded-xl py-3 items-center"
                  onPress={saveEdit}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-bg-card border border-border rounded-xl py-3 items-center"
                  onPress={() => setEditing(false)}
                >
                  <Text className="text-text-primary">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
