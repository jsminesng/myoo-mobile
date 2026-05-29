import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDiaryEntry, uploadDiaryMedia } from "@/services/diaryStorage";

type PickedMedia = {
  uri: string;
  type: "image" | "video";
};

export default function MediaScreen() {
  const { word, note } = useLocalSearchParams<{ word?: string; note?: string }>();
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);

  const onPickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const mediaType = asset.type === "video" ? "video" : "image";
    setPickedMedia({ uri: asset.uri, type: mediaType });
  };

  const onNext = async () => {
    try {
      setSaving(true);

      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | null = null;
      if (pickedMedia?.uri && pickedMedia.type) {
        mediaUrl = await uploadDiaryMedia({
          uri: pickedMedia.uri,
          mediaType: pickedMedia.type,
        });
        mediaType = pickedMedia.type;
      }

      await createDiaryEntry({
        word: word || "",
        note: note || "",
        mediaUrl,
        mediaType,
      });

      router.replace({
        pathname: "/layer-added",
        params: word ? { word } : {},
      });
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Failed to save your diary entry.");
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
        <View style={styles.headerRow}>
          <View />
          <Pressable style={styles.chatCircle} onPress={() => router.push("/chat")}>
            <Text style={styles.chatCircleText}>:)</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Want to add{"\n"}a photo or{"\n"}a video?</Text>

        <Pressable style={styles.uploadCard} onPress={onPickMedia}>
          {!pickedMedia && (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>↥</Text>
              <Text style={styles.uploadText}>upload</Text>
            </View>
          )}

          {pickedMedia?.type === "image" && (
            <Image source={{ uri: pickedMedia.uri }} style={styles.previewImage} />
          )}

          {pickedMedia?.type === "video" && (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoText}>video selected</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.nextButton, saving && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={saving}
        >
          <Text style={styles.nextText}>{saving ? "Saving..." : "Next"}</Text>
          <Text style={styles.nextArrow}>→</Text>
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
    paddingBottom: 28,
  },
  headerRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2f4b45",
    alignItems: "center",
    justifyContent: "center",
  },
  chatCircleText: {
    color: "#f2f0bd",
    fontSize: 16,
  },
  title: {
    marginTop: 62,
    color: "#334844",
    fontSize: 42,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: -1,
  },
  uploadCard: {
    marginTop: 24,
    height: 230,
    borderRadius: 24,
    backgroundColor: "#eef0be",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 58,
    lineHeight: 60,
    color: "#334844",
    marginBottom: 2,
  },
  uploadText: {
    color: "#334844",
    fontSize: 52,
    lineHeight: 56,
    fontWeight: "500",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#dfe8a7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoIcon: {
    fontSize: 44,
    color: "#334844",
  },
  videoText: {
    color: "#334844",
    fontSize: 26,
    fontWeight: "500",
  },
  nextButton: {
    marginTop: "auto",
    alignSelf: "center",
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef0be",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  nextButtonDisabled: {
    opacity: 0.55,
  },
  nextText: {
    color: "#334844",
    fontSize: 30,
    fontWeight: "500",
  },
  nextArrow: {
    color: "#334844",
    fontSize: 32,
    lineHeight: 34,
  },
});
