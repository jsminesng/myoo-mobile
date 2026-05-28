import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
    <View style={styles.container}>
      <Text style={styles.title}>{mode === "signin" ? "Sign In" : "Sign Up"}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {!!errorText && <Text style={styles.error}>{errorText}</Text>}
      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Loading..." : "Continue"}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
        <Text style={styles.toggle}>
          {mode === "signin" ? "Create account" : "Back to sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffd5",
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 12,
  },
  title: { fontSize: 34, fontWeight: "700", color: "#364c41", marginBottom: 8 },
  input: {
    backgroundColor: "#ffffc6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#364c41",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#364c41",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#ffffc6", fontSize: 16, fontWeight: "600" },
  toggle: { color: "#364c41", textAlign: "center", marginTop: 8 },
  error: { color: "#a53232" },
});

