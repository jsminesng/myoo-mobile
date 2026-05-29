import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Point = { x: number; y: number };

export default function FeelingScreen() {
  const { word } = useLocalSearchParams<{ word?: string }>();
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [activeStroke, setActiveStroke] = useState<Point[]>([]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          setActiveStroke([{ x: locationX, y: locationY }]);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          setActiveStroke((prev) => [...prev, { x: locationX, y: locationY }]);
        },
        onPanResponderRelease: () => {
          setStrokes((prev) => (activeStroke.length > 0 ? [...prev, activeStroke] : prev));
          setActiveStroke([]);
        },
        onPanResponderTerminate: () => {
          setStrokes((prev) => (activeStroke.length > 0 ? [...prev, activeStroke] : prev));
          setActiveStroke([]);
        },
      }),
    [activeStroke],
  );

  const allPoints = [...strokes, activeStroke].flat();

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

        <Text style={styles.title}>How are you{"\n"}feeling today?</Text>

        <View style={styles.drawArea} {...panResponder.panHandlers}>
          <View style={[styles.eyeGuide, styles.leftEyeGuide]} />
          <View style={[styles.eyeGuide, styles.rightEyeGuide]} />
          <View style={styles.mouthGuide} />

          {allPoints.map((point, index) => (
            <View
              key={`${point.x}-${point.y}-${index}`}
              style={[
                styles.drawPoint,
                {
                  left: point.x - 3,
                  top: point.y - 3,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={styles.nextButton}
          onPress={() =>
            router.push({
              pathname: "/note",
              params: word ? { word } : {},
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
    paddingHorizontal: 24,
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
    marginTop: 58,
    color: "#334844",
    fontSize: 50,
    lineHeight: 58,
    fontWeight: "600",
    letterSpacing: -1,
  },
  drawArea: {
    marginTop: 36,
    flex: 1,
    position: "relative",
  },
  eyeGuide: {
    position: "absolute",
    top: "30%",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#ccbfc0",
    borderStyle: "dashed",
  },
  leftEyeGuide: {
    left: "30%",
  },
  rightEyeGuide: {
    right: "30%",
  },
  mouthGuide: {
    position: "absolute",
    width: 130,
    borderBottomWidth: 4,
    borderStyle: "dashed",
    borderColor: "#ccbfc0",
    left: "50%",
    marginLeft: -65,
    top: "52%",
  },
  drawPoint: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#334844",
  },
  nextButton: {
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
