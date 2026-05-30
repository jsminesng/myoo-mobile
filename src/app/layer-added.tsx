import { getDiaryEntries, getDiaryEntryById } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

type Bubble = { word: string };
type SketchPoint = [number, number];

const EMOJIS = [";-(", "ㅠㅠ", ":-)", ":-|", ">_<", "^_^"];

function BubbleChip({
  word,
  emoji,
  sketch,
  style,
}: {
  word: string;
  emoji?: string;
  sketch?: string;
  style?: object;
}) {
  const parsedSketchStrokes: SketchPoint[][] | null = useMemo(() => {
    if (!sketch) return null;
    try {
      const raw = JSON.parse(sketch);
      if (!Array.isArray(raw)) return null;

      // Backward compatibility: old shape was SketchPoint[]
      const isFlatPointArray =
        raw.length > 0 &&
        Array.isArray(raw[0]) &&
        raw[0].length === 2 &&
        Number.isFinite(raw[0][0]) &&
        Number.isFinite(raw[0][1]);
      if (isFlatPointArray) {
        const points = raw
          .filter(
            (value) =>
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1]),
          )
          .map((value) => [Number(value[0]), Number(value[1])] as SketchPoint);
        return points.length > 1 ? [points] : null;
      }

      const strokes = raw
        .filter((stroke) => Array.isArray(stroke))
        .map((stroke) =>
          stroke
            .filter(
              (value: any) =>
                Array.isArray(value) &&
                value.length === 2 &&
                Number.isFinite(value[0]) &&
                Number.isFinite(value[1]),
            )
            .map((value: any) => [Number(value[0]), Number(value[1])] as SketchPoint),
        )
        .filter((stroke) => stroke.length > 1);

      return strokes.length > 0 ? strokes : null;
    } catch {
      return null;
    }
  }, [sketch]);

  return (
    <View style={[styles.wordChip, style]}>
      <Text style={styles.wordChipText}>{word}</Text>
      {parsedSketchStrokes ? (
        <View style={styles.emojiCircle}>
          <Svg width={34} height={34} viewBox="0 0 34 34">
            {parsedSketchStrokes.map((stroke, index) => {
              const points = stroke
                .map((point) => `${point[0] * 24 + 5},${point[1] * 24 + 5}`)
                .join(" ");
              return (
                <Polyline
                  key={`stroke-${index}`}
                  points={points}
                  fill="none"
                  stroke="#334844"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </Svg>
        </View>
      ) : emoji ? (
        <View style={styles.emojiCircle}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LayerAddedScreen() {
  const { id, word } = useLocalSearchParams<{ id?: string; word?: string }>();
  const [entries, setEntries] = useState<Bubble[]>([]);
  const [focusWord, setFocusWord] = useState((word || "").trim() || "Today");
  const [focusSketch, setFocusSketch] = useState<string | null>(null);
  const focusDrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    focusDrop.setValue(0);
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(focusDrop, {
        toValue: 1,
        duration: 520,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        router.replace({
          pathname: "/home",
          params: { drop: Date.now().toString() },
        });
      }
    });
  }, [focusDrop]);

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
      try {
        const data = await getDiaryEntries();
        if (!mounted) return;
        const uniqueWords = Array.from(
          new Set(
            data
              .map((entry) => entry.word?.trim())
              .filter((entryWord): entryWord is string => Boolean(entryWord))
              .filter((entryWord) => entryWord !== focusWord),
          ),
        )
          .slice(0, 8)
          .map((entryWord) => ({ word: entryWord }));
        setEntries(uniqueWords);
      } catch {
        if (mounted) setEntries([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [focusWord]);

  const bubbleRows = useMemo(() => {
    return [entries.slice(0, 3), entries.slice(3, 6), entries.slice(6, 8)].filter(
      (row) => row.length > 0,
    );
  }, [entries]);

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

        <Animated.View
          style={[
            styles.focusBubbleWrap,
            {
              transform: [
                {
                  translateY: focusDrop.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-120, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BubbleChip word={focusWord} emoji=";-(" sketch={focusSketch || undefined} />
        </Animated.View>

        <View style={styles.bottomBubbles}>
          {bubbleRows.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[
                styles.bubblesRow,
                rowIndex === 0 && styles.rowOne,
                rowIndex === 1 && styles.rowTwo,
                rowIndex === 2 && styles.rowThree,
              ]}
            >
              {row.map((bubble, index) => (
                <BubbleChip
                  key={`${bubble.word}-${index}`}
                  word={bubble.word}
                  emoji={EMOJIS[(rowIndex + index) % EMOJIS.length]}
                />
              ))}
            </View>
          ))}
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
  },
  focusBubbleWrap: {
    marginTop: 46,
    alignItems: "center",
  },
  bottomBubbles: {
    marginTop: "auto",
    minHeight: 190,
    paddingBottom: 10,
    overflow: "hidden",
    gap: 14,
  },
  bubblesRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
  },
  rowOne: {
    transform: [{ rotate: "-17deg" }],
    marginLeft: -14,
  },
  rowTwo: {
    transform: [{ rotate: "-28deg" }],
    marginLeft: -22,
  },
  rowThree: {
    transform: [{ rotate: "-20deg" }],
    marginLeft: -10,
  },
  wordChip: {
    backgroundColor: "#35554b",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordChipText: {
    color: "#eef0be",
    fontSize: 26,
    fontStyle: "italic",
    fontWeight: "600",
  },
  emojiCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e6e7b8",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    color: "#35554b",
    fontSize: 16,
    fontWeight: "600",
  },
});
