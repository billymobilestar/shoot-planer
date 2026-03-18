import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import type { ProjectWithRole } from "@/lib/types";

export default function DashboardScreen() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchProjects() {
    try {
      const token = await getToken();
      const data = await apiFetch("/api/projects", token);
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await apiFetch("/api/projects", token, {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      setShowCreate(false);
      fetchProjects();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  function renderProject({ item }: { item: ProjectWithRole }) {
    const isOwner = item.role === "owner";
    return (
      <TouchableOpacity
        className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-3"
        onPress={() => router.push(`/(app)/project/${item.id}/itinerary`)}
        activeOpacity={0.75}
      >
        {item.cover_image_url ? (
          <Image
            source={{ uri: item.cover_image_url }}
            className="w-full h-36"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-36 bg-bg-input items-center justify-center">
            <Ionicons name="film-outline" size={32} color="#6b6560" />
          </View>
        )}
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary font-semibold text-base flex-1 mr-2" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="bg-bg-input border border-border rounded-full px-2.5 py-0.5">
              <Text className="text-text-muted text-xs capitalize">{item.role}</Text>
            </View>
          </View>
          {item.description ? (
            <Text className="text-text-secondary text-sm mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {item.start_date ? (
            <View className="flex-row items-center gap-1 mt-2">
              <Ionicons name="calendar-outline" size={12} color="#6b6560" />
              <Text className="text-text-muted text-xs">
                {new Date(item.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
        <Text className="text-accent text-xl font-bold tracking-tight">Shoot Planner</Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="bg-accent rounded-full w-8 h-8 items-center justify-center"
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} className="w-8 h-8 rounded-full" />
            ) : (
              <View className="w-8 h-8 rounded-full bg-bg-input border border-border items-center justify-center">
                <Ionicons name="person-outline" size={16} color="#9a928a" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c87040" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProjects();
              }}
              tintColor="#c87040"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="film-outline" size={48} color="#333333" />
              <Text className="text-text-muted text-base mt-4">No projects yet</Text>
              <TouchableOpacity
                className="mt-4 bg-accent rounded-xl px-5 py-3"
                onPress={() => setShowCreate(true)}
              >
                <Text className="text-white font-medium">Create your first project</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Project Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowCreate(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-bg-card border-t border-border rounded-t-3xl px-6 pt-6 pb-10">
              <View className="w-10 h-1 bg-border-light rounded-full self-center mb-6" />
              <Text className="text-text-primary text-lg font-semibold mb-4">New Project</Text>
              <Text className="text-text-secondary text-sm mb-1.5">Project name</Text>
              <TextInput
                className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
                placeholder="My Shoot"
                placeholderTextColor="#6b6560"
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity
                className="bg-accent rounded-xl py-4 items-center mt-4"
                onPress={handleCreate}
                disabled={creating || !newName.trim()}
                style={{ opacity: creating || !newName.trim() ? 0.6 : 1 }}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Create Project</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
