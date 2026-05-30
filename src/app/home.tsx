import { getCurrentUser, getProfile } from "@/services/auth";
import { BubblePhysics } from "@/components/bubble-physics";
import { DiaryEntry, getDiaryEntries } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

const BUBBLE_ZONE_HEIGHT = 260;
type SketchPoint = [number, number];

const parseSketchToStrokes = (sketch?: string | null): SketchPoint[][] | null => {
  if (!sketch) return null;
  try {
    const raw = JSON.parse(sketch);
    if (!Array.isArray(raw)) return null;

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
};

const getBubbleWordFromEntry = (entry: DiaryEntry) => {
  const savedWord = entry.word?.trim();
  if (savedWord) return savedWord;

  const notePreview = entry.note?.trim();
  if (!notePreview) return "";

  const firstLine = notePreview.split("\n")[0]?.trim() || "";
  if (!firstLine) return "";
  return firstLine.length > 16 ? `${firstLine.slice(0, 16)}...` : firstLine;
};

export default function HomeScreen() {
  const { drop, word } = useLocalSearchParams<{ drop?: string; word?: string }>();
  const [name, setName] = useState("there");
  const [myooSketch, setMyooSketch] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [todayWord, setTodayWord] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) {
          router.replace("/auth");
          return;
        }
        const [profile, diaryEntries] = await Promise.all([
          getProfile(user.id),
          getDiaryEntries(),
        ]);
        if (!mounted) return;
        setName(profile?.display_name || user.email?.split("@")[0] || "there");
        setMyooSketch(profile?.myoo_sketch || null);
        setEntries(diaryEntries);
      } catch {
        if (!mounted) return;
        setEntries([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [drop]);

  const bubbleSourceEntries = useMemo(() => {
    const savedEntries = entries
      .map((entry) => ({
        id: entry.id,
        word: getBubbleWordFromEntry(entry),
        feeling: entry.feeling,
      }))
      .filter((entry) => Boolean(entry.word))
      .slice(0, 10);
    const incomingWord = word?.trim();
    if (!incomingWord) {
      return savedEntries;
    }

    const hasIncomingWord = savedEntries.some((entry) => entry.word === incomingWord);
    if (hasIncomingWord) {
      return savedEntries;
    }

    return [{ id: `incoming-${incomingWord}`, word: incomingWord, feeling: null }, ...savedEntries].slice(0, 10);
  }, [entries, word]);

  const bubbleWords = useMemo(() => bubbleSourceEntries.map((entry) => entry.word), [bubbleSourceEntries]);
  const myooStrokes = useMemo(() => parseSketchToStrokes(myooSketch), [myooSketch]);
  const hasTypedWord = todayWord.trim().length > 0;
  const moveToFeelingPage = () => {
    const word = todayWord.trim();
    router.push({
      pathname: "/feeling",
      params: word ? { word } : {},
    });
  };

  const bubblePhysicsItems = useMemo(
    () =>
      bubbleSourceEntries.map((entry) => ({
        text: entry.word,
        sketch: entry.feeling,
      })),
    [bubbleSourceEntries],
  );

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
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push("/profile")}
          >
            <SymbolView
              name="gearshape"
              size={30}
              weight="regular"
              tintColor="#35554b"
            />
          </Pressable>

          <View style={styles.chatHintWrap}>
            <Pressable
              style={styles.chatHint}
              onPress={() => router.push("/chat")}
            >
              <Text style={styles.chatHintText}>If you need some advise...</Text>
            </Pressable>
            <Pressable
              style={styles.chatCircle}
              onPress={() => router.push("/chat")}
            >
              {myooStrokes ? (
                <Svg width={30} height={30} viewBox="0 0 30 30">
                  {myooStrokes.map((stroke, index) => {
                    const points = stroke
                      .map((point) => `${point[0] * 20 + 5},${point[1] * 20 + 5}`)
                      .join(" ");
                    return (
                      <Polyline
                        key={`myoo-stroke-${index}`}
                        points={points}
                        fill="none"
                        stroke="#f2f0bd"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </Svg>
              ) : (
                <Text style={styles.chatCircleText}>:)</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.questionSection}>
          <Text style={styles.title}>
            Hi <Text style={styles.underlinedName}>{name}</Text>!{"\n"}
            What's one{"\n"}
            word for your{"\n"}
            day today?
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              value={todayWord}
              onChangeText={setTodayWord}
              style={styles.input}
              placeholder=" "
              placeholderTextColor="#9ea089"
              onSubmitEditing={moveToFeelingPage}
            />
            {hasTypedWord && (
              <Pressable
                style={styles.inlineArrowButton}
                onPress={moveToFeelingPage}
              >
                <Text style={styles.inlineArrowText}>→</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.bubblesLayer}>
          <BubblePhysics
            items={bubblePhysicsItems}
            enabled
            onBubbleClick={(_, index) => {
              const target = bubbleSourceEntries[index];
              if (!target) return;
              if (target.id.startsWith("incoming-")) {
                router.push({
                  pathname: "/feeling",
                  params: target.word ? { word: target.word } : {},
                });
                return;
              }
              router.push({ pathname: "/entry/[id]", params: { id: target.id } });
            }}
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
    backgroundColor: "transparent",
  },
  headerRow: {
    paddingTop: 6,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "500",
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
  questionSection: {
    paddingHorizontal: 14,
    paddingTop: 22,
    gap: 18,
  },
  title: {
    color: "#334844",
    fontSize: 54,
    lineHeight: 63,
    fontWeight: "600",
    letterSpacing: -1,
  },
  underlinedName: {
    textDecorationLine: "underline",
    textDecorationColor: "#334844",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#f3f2be",
    paddingHorizontal: 14,
    fontSize: 36,
    color: "#334844",
  },
  inlineArrowButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#f3f2be",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineArrowText: {
    color: "#334844",
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "600",
  },
  bubblesLayer: {
    marginTop: "auto",
    height: BUBBLE_ZONE_HEIGHT,
    paddingBottom: 8,
    overflow: "visible",
    position: "relative",
    zIndex: 5,
  },
});
