import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NoteScreen() {
  const { word } = useLocalSearchParams<{ word?: string }>();
  const [note, setNote] = useState("");

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

        <Text style={styles.title}>Leave a note{"\n"}for yourself.</Text>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder=" "
          placeholderTextColor="#9ea089"
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={styles.nextButton}
          onPress={() =>
            router.push({
              pathname: "/media",
              params: {
                ...(word ? { word } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
              },
            })
          }
        >
          <Text style={styles.nextText}>Next</Text>
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
    fontSize: 52,
    lineHeight: 60,
    fontWeight: "600",
    letterSpacing: -1,
  },
  noteInput: {
    marginTop: 24,
    height: 290,
    borderRadius: 24,
    backgroundColor: "#eef0be",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#334844",
    fontSize: 24,
    lineHeight: 34,
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
