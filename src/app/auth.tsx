import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { signInWithEmail, signUpWithEmail } from "@/services/auth";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorText("");
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setErrorText("Email and password are required.");
        return;
      }

      if (mode === "signin") {
        await signInWithEmail(trimmedEmail, password);
        router.replace("/");
      } else {
        const signUpResult = await signUpWithEmail(trimmedEmail, password);
        if (signUpResult.session) {
          router.replace("/");
          return;
        }
        setErrorText("Sign up complete. Please verify your email, then sign in.");
        setMode("signin");
        return;
      }
    } catch (error: any) {
      const raw = String(error?.message || "Authentication failed.");
      if (raw.toLowerCase().includes("invalid login credentials")) {
        setErrorText("Invalid email or password.");
        return;
      }
      if (raw.toLowerCase().includes("email not confirmed")) {
        setErrorText("Please verify your email first, then sign in.");
        return;
      }
      setErrorText(raw);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#efc2da", "#f2d6df", "#f3efc0"]}
        start={{ x: 0.2, y: 0.05 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        <Text style={styles.title}>{mode === "signin" ? "Welcome back" : "Create account"}</Text>
        <Text style={styles.subtitle}>
          {mode === "signin"
            ? "Sign in to continue your day with MYOO."
            : "Start your MYOO journey in a minute."}
        </Text>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6a726f"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6a726f"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {!!errorText && <Text style={styles.error}>{errorText}</Text>}
          <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Loading..." : "Continue"}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={styles.toggle}>
            {mode === "signin" ? "Create account" : "Back to sign in"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#efc2da",
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "600",
    color: "#334844",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#3d4e49",
    fontSize: 16,
    marginBottom: 2,
  },
  formCard: {
    backgroundColor: "rgba(241, 239, 208, 0.9)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },
  input: {
    backgroundColor: "#eef0be",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#334844",
    fontSize: 17,
    fontWeight: "500",
  },
  button: {
    marginTop: 6,
    backgroundColor: "#334844",
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { color: "#eef0be", fontSize: 17, fontWeight: "700" },
  toggle: {
    color: "#334844",
    textAlign: "center",
    marginTop: 6,
    fontSize: 15,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  error: {
    color: "#a53232",
    textAlign: "center",
    marginTop: 2,
  },
});

