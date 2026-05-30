import { getDiaryEntryById, resolveDiaryMediaUrl } from "@/services/diaryStorage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";
import { Image } from "expo-image";

type SketchPoint = [number, number];
const MYOO_FACE_SOURCE = require("../../../assets/images/icon.png");

function SketchCircle({ sketch }: { sketch?: string | null }) {
  const parsedSketchStrokes: SketchPoint[][] | null = useMemo(() => {
    if (!sketch) return null;
    try {
      const raw = JSON.parse(sketch);
      if (!Array.isArray(raw)) return null;
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
    <View style={styles.sketchCircle}>
      {parsedSketchStrokes ? (
        <Svg width={56} height={56} viewBox="0 0 56 56">
          {parsedSketchStrokes.map((stroke, index) => {
            const points = stroke
              .map((point) => `${point[0] * 40 + 8},${point[1] * 40 + 8}`)
              .join(" ");
            return (
              <Polyline
                key={`stroke-${index}`}
                points={points}
                fill="none"
                stroke="#2e4a42"
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </Svg>
      ) : (
        <Text style={styles.sketchFallback}>:)</Text>
      )}
    </View>
  );
}

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [entry, setEntry] = useState<Awaited<ReturnType<typeof getDiaryEntryById>>>(null);
  const [displayMediaUrl, setDisplayMediaUrl] = useState<string | null>(null);
  const [retriedWithSignedUrl, setRetriedWithSignedUrl] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      try {
        const data = await getDiaryEntryById(id);
        if (!mounted) return;
        setEntry(data);
      } catch {
        if (mounted) setEntry(null);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const resolveUrl = async () => {
      const resolved = await resolveDiaryMediaUrl(entry?.media);
      if (!mounted) return;
      setDisplayMediaUrl(resolved);
      setRetriedWithSignedUrl(false);
    };
    resolveUrl();

    return () => {
      mounted = false;
    };
  }, [entry?.id, entry?.media]);

  const formattedDate = useMemo(() => {
    const raw = entry?.date || "";
    if (!raw) return "";
    const onlyDate = raw.slice(0, 10);
    return onlyDate.replaceAll("-", ".");
  }, [entry?.date]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.wordRow}>
          <View style={styles.wordPill}>
            <Text style={styles.wordText}>{entry?.word || "Today"}</Text>
          </View>
          <SketchCircle sketch={entry?.feeling} />
        </View>

        <Text style={styles.noteText}>{entry?.note || "No note yet."}</Text>

        {displayMediaUrl && entry?.mediaType !== "video" ? (
          <Image
            source={{ uri: displayMediaUrl }}
            style={styles.mediaImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            onError={async () => {
              if (!entry?.media || retriedWithSignedUrl) return;
              const resolvedUrl = await resolveDiaryMediaUrl(entry.media);
              if (resolvedUrl && resolvedUrl !== displayMediaUrl) {
                setDisplayMediaUrl(resolvedUrl);
              }
              setRetriedWithSignedUrl(true);
            }}
          />
        ) : null}

        <Pressable
          style={styles.helpRow}
          onPress={() => router.push("/chat")}
        >
          <View style={styles.helpIconCircle}>
            <Image
              source={MYOO_FACE_SOURCE}
              style={styles.helpIconImage}
              contentFit="cover"
            />
          </View>
          <View style={styles.helpBubble}>
            <Text style={styles.helpText}>If you need some help..</Text>
          </View>
        </Pressable>

        {!!formattedDate && <Text style={styles.dateText}>{formattedDate}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2e4a42",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  backText: {
    color: "#f2f0bd",
    fontSize: 54,
    lineHeight: 52,
    fontWeight: "400",
  },
  wordRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wordPill: {
    flex: 1,
    backgroundColor: "#e8bcde",
    borderRadius: 34,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  wordText: {
    color: "#2e4a42",
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "500",
  },
  sketchCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eef0be",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sketchFallback: {
    color: "#2e4a42",
    fontSize: 22,
    fontWeight: "600",
  },
  noteText: {
    marginTop: 26,
    color: "#f2f0bd",
    fontSize: 16,
    lineHeight: 34,
    fontWeight: "400",
  },
  mediaImage: {
    marginTop: 26,
    width: "100%",
    height: 280,
    borderRadius: 24,
  },
  helpRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helpIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e8bcde",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  helpIconImage: {
    width: "100%",
    height: "100%",
  },
  helpBubble: {
    backgroundColor: "#eef0be",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  helpText: {
    color: "#2e4a42",
    fontSize: 16,
    fontWeight: "500",
  },
  dateText: {
    marginTop: 14,
    alignSelf: "center",
    color: "#f2f0bd",
    fontSize: 18,
    fontWeight: "700",
  },
});
