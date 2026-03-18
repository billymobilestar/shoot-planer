import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/hooks/useApi";

interface Props {
  projectId: string;
  shootDayId: string;
  position: number;
  onCreated: () => void;
  onClose: () => void;
}

export default function AddLocationModal({ projectId, shootDayId, position, onCreated, onClose }: Props) {
  const { request } = useApi();
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await request(`/api/projects/${projectId}/locations`, {
        method: "POST",
        body: JSON.stringify({
          shoot_day_id: shootDayId,
          name: form.name.trim(),
          description: form.description || null,
          address: form.address || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          notes: form.notes || null,
          position,
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity className="flex-1 bg-black/60" activeOpacity={1} onPress={onClose} />
        <View className="bg-bg-card border-t border-border rounded-t-3xl">
          {/* Handle */}
          <View className="w-10 h-1 bg-border-light rounded-full self-center mt-3 mb-2" />

          <View className="flex-row items-center justify-between px-5 py-3">
            <Text className="text-text-primary font-semibold text-lg">Add Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b6560" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
            {/* Name */}
            <View className="mb-3">
              <Text className="text-text-secondary text-sm mb-1.5">Location name *</Text>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                placeholder="e.g. Rooftop Studio"
                placeholderTextColor="#6b6560"
                value={form.name}
                onChangeText={(v) => update("name", v)}
                autoFocus
              />
            </View>

            {/* Description */}
            <View className="mb-3">
              <Text className="text-text-secondary text-sm mb-1.5">Description</Text>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                placeholder="Optional description"
                placeholderTextColor="#6b6560"
                value={form.description}
                onChangeText={(v) => update("description", v)}
                multiline
                numberOfLines={2}
                style={{ minHeight: 70, textAlignVertical: "top" }}
              />
            </View>

            {/* Address */}
            <View className="mb-3">
              <Text className="text-text-secondary text-sm mb-1.5">Address</Text>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                placeholder="Full address"
                placeholderTextColor="#6b6560"
                value={form.address}
                onChangeText={(v) => update("address", v)}
              />
            </View>

            {/* Coordinates */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1.5">Latitude</Text>
                <TextInput
                  className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  placeholder="0.0000"
                  placeholderTextColor="#6b6560"
                  value={form.latitude}
                  onChangeText={(v) => update("latitude", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1.5">Longitude</Text>
                <TextInput
                  className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                  placeholder="0.0000"
                  placeholderTextColor="#6b6560"
                  value={form.longitude}
                  onChangeText={(v) => update("longitude", v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Notes */}
            <View className="mb-5">
              <Text className="text-text-secondary text-sm mb-1.5">Notes</Text>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-base"
                placeholder="Any notes..."
                placeholderTextColor="#6b6560"
                value={form.notes}
                onChangeText={(v) => update("notes", v)}
                multiline
                numberOfLines={2}
                style={{ minHeight: 70, textAlignVertical: "top" }}
              />
            </View>
          </ScrollView>

          <View className="px-5 pb-8 pt-3 border-t border-border">
            <TouchableOpacity
              className="bg-accent rounded-xl py-4 items-center"
              onPress={handleSave}
              disabled={saving || !form.name.trim()}
              style={{ opacity: saving || !form.name.trim() ? 0.6 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Add Location</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
