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
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password, firstName });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert("Sign up failed", err.errors?.[0]?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)/dashboard");
      }
    } catch (err: any) {
      Alert.alert("Verification failed", err.errors?.[0]?.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-bg-primary"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-6">
          <View className="mb-10">
            <Text className="text-text-primary text-2xl font-bold">Check your email</Text>
            <Text className="text-text-secondary text-base mt-1">
              We sent a verification code to {email}
            </Text>
          </View>

          <View className="gap-3">
            <TextInput
              className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary text-base text-center tracking-widest"
              placeholder="000000"
              placeholderTextColor="#6b6560"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              className="bg-accent rounded-xl py-4 items-center"
              onPress={handleVerify}
              disabled={loading || code.length < 6}
              style={{ opacity: loading || code.length < 6 ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-10">
          <Text className="text-accent text-3xl font-bold tracking-tight">Shoot Planner</Text>
          <Text className="text-text-secondary text-base mt-1">Create your account</Text>
        </View>

        <View className="gap-3">
          <View>
            <Text className="text-text-secondary text-sm mb-1.5">First name</Text>
            <TextInput
              className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
              placeholder="Alex"
              placeholderTextColor="#6b6560"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
            />
          </View>

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
              autoComplete="new-password"
            />
          </View>

          <TouchableOpacity
            className="bg-accent rounded-xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={loading || !email || !password || !firstName}
            style={{ opacity: loading || !email || !password || !firstName ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted">Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-accent font-medium">Sign in</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
