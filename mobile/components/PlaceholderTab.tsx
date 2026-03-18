import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  phase: string;
}

export default function PlaceholderTab({ title, icon, phase }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#9a928a" />
        </TouchableOpacity>
        <Text className="text-text-primary font-semibold text-lg">{title}</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 bg-bg-card border border-border rounded-2xl items-center justify-center mb-4">
          <Ionicons name={icon} size={28} color="#c87040" />
        </View>
        <Text className="text-text-primary font-semibold text-lg mb-2">{title}</Text>
        <Text className="text-text-muted text-sm text-center">
          Coming in {phase}
        </Text>
      </View>
    </SafeAreaView>
  );
}
