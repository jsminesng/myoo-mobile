import {
  getCurrentUser,
  getProfile,
  signOutUser,
  updateUserPassword,
  upsertProfile,
} from "@/services/auth";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted || !user?.id) return;
        setUserId(user.id);
        setEmail(user.email || "");
        const profile = await getProfile(user.id);
        if (!mounted) return;
        setName(profile?.display_name || user.email?.split("@")[0] || "");
      } catch (error: any) {
        if (mounted) setErrorText(error?.message || "Failed to load profile.");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      setErrorText("");
      await upsertProfile({
        userId,
        displayName: name.trim() || "User",
        onboardingCompleted: true,
      });
      if (password.trim()) {
        if (password.trim().length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await updateUserPassword(password.trim());
        setPassword("");
      }
      router.back();
    } catch (error: any) {
      setErrorText(error?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
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
        <Text style={styles.title}>Profile</Text>

        <View style={styles.myooSection}>
          <Text style={styles.myooLabel}>Your MYOO</Text>
          <View style={styles.myooFace}>
            <Text style={styles.faceText}>☺</Text>
          </View>
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={email}
            editable={false}
            style={[styles.input, styles.readOnlyInput]}
            placeholder="Email"
            placeholderTextColor="#6a726f"
          />
        </View>

        <Text style={styles.label}>Name</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6a726f"
          />
          <Text style={styles.editIcon}>✎</Text>
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#6a726f"
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.editIcon}>✎</Text>
        </View>

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await signOutUser();
            router.replace("/auth");
          }}
        >
          <Text style={styles.logoutText}>Log out</Text>
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
    paddingBottom: 24,
  },
  title: {
    marginTop: 26,
    color: "#334844",
    fontSize: 42,
    fontWeight: "600",
    textAlign: "center",
  },
  label: {
    marginTop: 20,
    color: "#334844",
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 2,
  },
  inputRow: {
    marginTop: 6,
    backgroundColor: "#eef0be",
    borderRadius: 24,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#334844",
    fontSize: 20,
    fontWeight: "500",
  },
  readOnlyInput: {
    opacity: 0.85,
  },
  editIcon: {
    color: "#334844",
    fontSize: 22,
  },
  myooLabel: {
    alignSelf: "center",
    color: "#334844",
    fontSize: 20,
    fontWeight: "500",
  },
  myooSection: {
    marginTop: 18,
    marginBottom: 10,
  },
  myooFace: {
    marginTop: 10,
    width: 156,
    height: 156,
    borderRadius: 78,
    alignSelf: "center",
    backgroundColor: "#eef0be",
    alignItems: "center",
    justifyContent: "center",
  },
  faceText: {
    fontSize: 62,
    color: "#334844",
  },
  error: {
    marginTop: 18,
    color: "#a53232",
    textAlign: "center",
  },
  saveButton: {
    marginTop: "auto",
    alignSelf: "center",
    backgroundColor: "#eef0be",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  saveText: {
    color: "#334844",
    fontSize: 20,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginTop: 14,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoutText: {
    color: "#334844",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
