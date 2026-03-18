import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Link } from "expo-router";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Sign in failed", err.errors?.[0]?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo / Title */}
        <View className="mb-10">
          <Text className="text-accent text-3xl font-bold tracking-tight">Shoot Planner</Text>
          <Text className="text-text-secondary text-base mt-1">Sign in to your account</Text>
        </View>

        {/* Form */}
        <View className="gap-3">
          <View>
            <Text className="text-text-secondary text-sm mb-1.5">Email</Text>
            <TextInput
              className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
              placeholder="you@example.com"
              placeholderTextColor="#6b6560"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-text-secondary text-sm mb-1.5">Password</Text>
            <TextInput
              className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
              placeholder="••••••••"
              placeholderTextColor="#6b6560"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            className="bg-accent rounded-xl py-4 items-center mt-2"
            onPress={handleSignIn}
            disabled={loading || !email || !password}
            style={{ opacity: loading || !email || !password ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted">Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-accent font-medium">Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
