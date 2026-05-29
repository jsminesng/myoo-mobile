import { getDiaryEntries } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Bubble = { word: string };

const EMOJIS = [";-(", "ㅠㅠ", ":-)", ":-|", ">_<", "^_^"];

function BubbleChip({
  word,
  emoji,
  style,
}: {
  word: string;
  emoji?: string;
  style?: object;
}) {
  return (
    <View style={[styles.wordChip, style]}>
      <Text style={styles.wordChipText}>{word}</Text>
      {emoji ? (
        <View style={styles.emojiCircle}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LayerAddedScreen() {
  const { word } = useLocalSearchParams<{ word?: string }>();
  const [entries, setEntries] = useState<Bubble[]>([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace("/home");
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

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
              .filter((entryWord) => entryWord !== (word || "").trim()),
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
  }, [word]);

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

        <View style={styles.focusBubbleWrap}>
          <BubbleChip word={word?.trim() || "Today"} emoji=";-(" />
        </View>

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
    backgroundColor: "#334844",
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordChipText: {
    color: "#f7f4c5",
    fontSize: 26,
    fontWeight: "500",
  },
  emojiCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eef0be",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    color: "#334844",
    fontSize: 16,
    fontWeight: "600",
  },
});
