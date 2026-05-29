import { getCurrentUser, getProfile } from "@/services/auth";
import { DiaryEntry, getDiaryEntries } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const BUBBLE_ZONE_HEIGHT = 260;
const BUBBLE_GAP = 10;

export default function HomeScreen() {
  const { drop } = useLocalSearchParams<{ drop?: string }>();
  const [name, setName] = useState("there");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [todayWord, setTodayWord] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const user = await getCurrentUser();
      if (!user?.id) {
        router.replace("/auth");
        return;
      }
      const profile = await getProfile(user.id);
      const diaryEntries = await getDiaryEntries();
      if (!mounted) return;
      setName(profile?.display_name || user.email?.split("@")[0] || "there");
      setEntries(diaryEntries);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const bubbleSourceEntries = useMemo(() => {
    return entries
      .filter((entry) => Boolean(entry.word?.trim()))
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        word: entry.word.trim(),
      }));
  }, [entries]);

  const bubbleWords = useMemo(() => bubbleSourceEntries.map((entry) => entry.word), [bubbleSourceEntries]);
  const hasTypedWord = todayWord.trim().length > 0;
  const moveToFeelingPage = () => {
    const word = todayWord.trim();
    router.push({
      pathname: "/feeling",
      params: word ? { word } : {},
    });
  };

  const bubbleItems = useMemo(() => {
    const placedRects: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];
    const items: Array<{
      id: string;
      word: string;
      left: number;
      top: number;
      rotate: number;
    }> = [];

    bubbleSourceEntries.forEach(({ id, word }, index) => {
      const widthEstimate = Math.max(108, Math.min(236, word.length * 24 + 64));
      const heightEstimate = 76;
      const minLeft = 8;
      const minTop = 10;
      const maxLeft = Math.max(minLeft, SCREEN_WIDTH - widthEstimate - 10);
      const maxTop = Math.max(minTop, BUBBLE_ZONE_HEIGHT - heightEstimate - 8);
      const rotate = -29 + Math.random() * 22;
      let placed = false;

      for (let attempt = 0; attempt < 48; attempt += 1) {
        const left = minLeft + Math.random() * (maxLeft - minLeft);
        const top = minTop + Math.random() * (maxTop - minTop);

        const overlaps = placedRects.some((rect) => {
          const separated =
            left + widthEstimate + BUBBLE_GAP < rect.left ||
            left > rect.left + rect.width + BUBBLE_GAP ||
            top + heightEstimate + BUBBLE_GAP < rect.top ||
            top > rect.top + rect.height + BUBBLE_GAP;
          return !separated;
        });

        if (!overlaps) {
          placedRects.push({
            left,
            top,
            width: widthEstimate,
            height: heightEstimate,
          });
          items.push({ id, word, left, top, rotate });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // If there is no free space, skip extra bubbles to avoid overlap.
      }
    });

    return items;
  }, [bubbleWords.join("|"), drop, bubbleSourceEntries]);

  const bubbleItemsKey = bubbleItems
    .map(
      (item) => `${item.word}-${Math.round(item.left)}-${Math.round(item.top)}`,
    )
    .join("|");
  const bubbleAnimations = useMemo(
    () => bubbleItems.map(() => new Animated.Value(0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bubbleItemsKey],
  );

  useEffect(() => {
    bubbleAnimations.forEach((value) => value.setValue(0));
    const sequence = bubbleAnimations.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    Animated.stagger(180, sequence).start();
  }, [bubbleAnimations]);

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
            <Text style={styles.iconText}>S</Text>
          </Pressable>

          <View style={styles.chatHintWrap}>
            <Pressable
              style={styles.chatHint}
              onPress={() => router.push("/chat")}
            >
              <Text style={styles.chatHintText}>
                If you need some advise...
              </Text>
            </Pressable>
            <Pressable
              style={styles.chatCircle}
              onPress={() => router.push("/chat")}
            >
              <Text style={styles.chatCircleText}>:)</Text>
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
          {bubbleItems.map((item, index) => (
            <Animated.View
              key={`${item.word}-${index}`}
              style={[
                styles.bubbleShell,
                {
                  left: item.left,
                  top: item.top,
                  transform: [
                    {
                      translateY: bubbleAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SCREEN_HEIGHT, 0],
                      }),
                    },
                    { rotate: `${item.rotate}deg` },
                  ],
                  opacity: bubbleAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            >
              <Pressable
                style={styles.wordChip}
                onPress={() => {
                  router.push({ pathname: "/entry/[id]", params: { id: item.id } });
                }}
              >
                <Text style={styles.wordChipText}>{item.word}</Text>
              </Pressable>
            </Animated.View>
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 19,
    color: "#2f4b45",
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
  bubbleShell: {
    position: "absolute",
  },
  wordChip: {
    backgroundColor: "#334844",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  wordChipText: {
    color: "#f7f4c5",
    fontSize: 43,
    fontWeight: "500",
    letterSpacing: -0.7,
  },
});
