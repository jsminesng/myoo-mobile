import { BubblePhysics } from "@/components/bubble-physics";
import { getDiaryEntries, getDiaryEntryById } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type ExistingBubble = { word: string; sketch: string | null };

const NEW_BUBBLE_RELEASE_DELAY_MS = 2100;
const NEW_BUBBLE_FALL_MS = 900;
const HOLD_BEFORE_REDIRECT_MS = 650;

export default function LayerAddedScreen() {
  const { id, word } = useLocalSearchParams<{ id?: string; word?: string }>();
  const [entries, setEntries] = useState<ExistingBubble[]>([]);
  const [areEntriesReady, setAreEntriesReady] = useState(false);
  const [focusWord, setFocusWord] = useState((word || "").trim() || "Today");
  const [focusSketch, setFocusSketch] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadFocusEntry = async () => {
      if (!id) return;
      try {
        const entry = await getDiaryEntryById(id);
        if (!mounted || !entry) return;
        setFocusWord(entry.word?.trim() || "Today");
        setFocusSketch(entry.feeling || null);
      } catch {
        if (mounted) {
          setFocusWord((word || "").trim() || "Today");
          setFocusSketch(null);
        }
      }
    };
    loadFocusEntry();
    return () => {
      mounted = false;
    };
  }, [id, word]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) setAreEntriesReady(false);
      try {
        const data = await getDiaryEntries();
        if (!mounted) return;
        const uniqueWords = Array.from(
          new Set(
            data
              .map((entry) => `${entry.word?.trim() || ""}:::${entry.feeling || ""}`)
              .filter((entryWord): entryWord is string => Boolean(entryWord))
              .filter((entryWord) => !entryWord.startsWith(`${focusWord}:::`)),
          ),
        )
          .slice(0, 8)
          .map((entryWord) => {
            const [entryOnlyWord, entryOnlyFeeling = ""] = entryWord.split(":::");
            return { word: entryOnlyWord, sketch: entryOnlyFeeling || null };
          });
        setEntries(uniqueWords);
      } catch {
        if (mounted) setEntries([]);
      } finally {
        if (mounted) setAreEntriesReady(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [focusWord]);

  const existingBubbleItems = useMemo(() => {
    return entries.map((entry) => ({
      text: entry.word,
      sketch: entry.sketch,
    }));
  }, [entries]);
  const allBubbleItems = useMemo(
    () => [
      ...existingBubbleItems,
      {
        text: focusWord,
        sketch: focusSketch,
      },
    ],
    [existingBubbleItems, focusSketch, focusWord],
  );

  useEffect(() => {
    if (!areEntriesReady) return;
    hasRedirectedRef.current = false;
    const redirectTimer = setTimeout(() => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      router.replace({
        pathname: "/home",
        params: { drop: Date.now().toString() },
      });
    }, NEW_BUBBLE_RELEASE_DELAY_MS + NEW_BUBBLE_FALL_MS + HOLD_BEFORE_REDIRECT_MS);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [areEntriesReady]);

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
          <View style={styles.spacer} />
          <View style={styles.chatHintWrap}>
            <View style={styles.chatHint}>
              <Text style={styles.chatHintText}>Great job!</Text>
            </View>
            <Pressable style={styles.chatCircle} onPress={() => router.push("/chat")}>
              <Text style={styles.chatCircleText}>:)</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>One more{"\n"}layer added!</Text>

        <View style={styles.bubblesLayer}>
          <BubblePhysics
            items={allBubbleItems}
            enabled
            gravityY={1.38}
            spawnYOffsetRange={[220, 520]}
            centerStartAt="middle"
            centerYRatio={0.42}
            holdLastBubbleMs={NEW_BUBBLE_RELEASE_DELAY_MS}
            releaseLastOnSettle
          />
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  spacer: {
    width: 28,
    height: 28,
  },
  chatHintWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatHint: {
    backgroundColor: "#f3f2be",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chatHintText: {
    color: "#2f4b45",
    fontSize: 14,
    fontWeight: "600",
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
    marginTop: 58,
    color: "#334844",
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "600",
    letterSpacing: -1,
    zIndex: 10,
  },
  bubblesLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  /* legacy style name preserved to avoid broad structural churn */
  bottomBubbles: {
    position: "absolute",
    width: 0,
    height: 0,
  },
});
