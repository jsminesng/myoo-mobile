import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getCurrentUser, getProfile } from "@/services/auth";

export default function IndexScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted) return;

        if (!user) {
          router.replace("/auth");
          return;
        }

        const profile = await getProfile(user.id);
        if (!mounted) return;

        if (!profile?.onboarding_completed) {
          router.replace("/onboarding");
          return;
        }

        router.replace("/home");
      } catch {
        router.replace("/auth");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#364c41" />
      <Text style={styles.text}>{loading ? "Loading..." : "Redirecting..."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffd5",
    gap: 12,
  },
  text: {
    color: "#364c41",
    fontSize: 16,
    fontWeight: "600",
  },
});
