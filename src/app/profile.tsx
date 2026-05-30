import {
  getCurrentUser,
  getProfile,
  signOutUser,
  updateUserPassword,
  upsertProfile,
} from "@/services/auth";
import { getDiaryEntries } from "@/services/diaryStorage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

type SketchPoint = [number, number];

const MYOO_EDITOR_SIZE = 260;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizePointValue = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value >= 0 && value <= 1) return value;
  return clamp(value / MYOO_EDITOR_SIZE, 0, 1);
};

const parseSketchToNormalizedStrokes = (sketch?: string | null): SketchPoint[][] | null => {
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
        .map(
          (value) =>
            [normalizePointValue(Number(value[0])), normalizePointValue(Number(value[1]))] as SketchPoint,
        );
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
          .map(
            (value: any) =>
              [normalizePointValue(Number(value[0])), normalizePointValue(Number(value[1]))] as SketchPoint,
          ),
      )
      .filter((stroke) => stroke.length > 1);

    return strokes.length > 0 ? strokes : null;
  } catch {
    return null;
  }
};

const buildSketchPayload = (strokes: SketchPoint[][]) => {
  const validStrokes = strokes.filter((stroke) => stroke.length > 1);
  if (validStrokes.length === 0) return null;

  const maxPointsPerStroke = 60;
  const normalizedStrokes = validStrokes.map((stroke) => {
    const step = Math.max(1, Math.ceil(stroke.length / maxPointsPerStroke));
    return stroke
      .filter((_, index) => index % step === 0)
      .map((point) => [
        Number((clamp(point[0], 0, MYOO_EDITOR_SIZE) / MYOO_EDITOR_SIZE).toFixed(3)),
        Number((clamp(point[1], 0, MYOO_EDITOR_SIZE) / MYOO_EDITOR_SIZE).toFixed(3)),
      ]);
  });
  return JSON.stringify(normalizedStrokes);
};

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [myooSketch, setMyooSketch] = useState<string | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [draftStrokes, setDraftStrokes] = useState<SketchPoint[][]>([]);
  const [activeStroke, setActiveStroke] = useState<SketchPoint[]>([]);
  const activeStrokeRef = useRef<SketchPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const parsedMyooStrokes = useMemo(
    () => parseSketchToNormalizedStrokes(myooSketch),
    [myooSketch],
  );
  const editorPreviewStrokes = useMemo(
    () => [...draftStrokes, activeStroke].filter((stroke) => stroke.length > 1),
    [draftStrokes, activeStroke],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const nextStroke: SketchPoint[] = [
            [clamp(locationX, 0, MYOO_EDITOR_SIZE), clamp(locationY, 0, MYOO_EDITOR_SIZE)],
          ];
          activeStrokeRef.current = nextStroke;
          setActiveStroke(nextStroke);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const nextStroke: SketchPoint[] = [
            ...activeStrokeRef.current,
            [clamp(locationX, 0, MYOO_EDITOR_SIZE), clamp(locationY, 0, MYOO_EDITOR_SIZE)],
          ];
          activeStrokeRef.current = nextStroke;
          setActiveStroke(nextStroke);
        },
        onPanResponderRelease: () => {
          const committedStroke = [...activeStrokeRef.current];
          setDraftStrokes((prev) =>
            committedStroke.length > 1 ? [...prev, committedStroke] : prev,
          );
          activeStrokeRef.current = [];
          setActiveStroke([]);
        },
        onPanResponderEnd: () => {
          const committedStroke = [...activeStrokeRef.current];
          setDraftStrokes((prev) =>
            committedStroke.length > 1 ? [...prev, committedStroke] : prev,
          );
          activeStrokeRef.current = [];
          setActiveStroke([]);
        },
        onPanResponderTerminate: () => {
          const committedStroke = [...activeStrokeRef.current];
          setDraftStrokes((prev) =>
            committedStroke.length > 1 ? [...prev, committedStroke] : prev,
          );
          activeStrokeRef.current = [];
          setActiveStroke([]);
        },
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted || !user?.id) return;
        setUserId(user.id);
        setEmail(user.email || "");
        const profile = await getProfile(user.id);
        if (!mounted) return;
        setName(profile?.display_name || user.email?.split("@")[0] || "");
        if (profile?.myoo_sketch) {
          setMyooSketch(profile.myoo_sketch);
        } else {
          const diaryEntries = await getDiaryEntries();
          if (!mounted) return;
          const latestFeeling = diaryEntries.find((entry) => Boolean(entry.feeling))?.feeling || null;
          setMyooSketch(latestFeeling);
        }
      } catch (error: any) {
        if (mounted) setErrorText(error?.message || "Failed to load profile.");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      setErrorText("");
      await upsertProfile({
        userId,
        displayName: name.trim() || "User",
        onboardingCompleted: true,
        myooSketch,
      });
      if (password.trim()) {
        if (password.trim().length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await updateUserPassword(password.trim());
        setPassword("");
      }
      router.back();
    } catch (error: any) {
      setErrorText(error?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const openEditor = () => {
    const normalized = parseSketchToNormalizedStrokes(myooSketch);
    const denormalized = (normalized || []).map((stroke) =>
      stroke.map(
        (point) =>
          [point[0] * MYOO_EDITOR_SIZE, point[1] * MYOO_EDITOR_SIZE] as SketchPoint,
      ),
    );
    setDraftStrokes(denormalized);
    activeStrokeRef.current = [];
    setActiveStroke([]);
    setIsEditorVisible(true);
  };

  const applyEditor = () => {
    const payload = buildSketchPayload(editorPreviewStrokes);
    setMyooSketch(payload);
    setIsEditorVisible(false);
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
          <Pressable
            style={styles.backButton}
            onPress={() => router.push("/home")}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.myooSection}>
          <Text style={styles.myooLabel}>Your MYOO</Text>
          <Pressable style={styles.myooFace} onPress={openEditor}>
            {parsedMyooStrokes ? (
              <Svg width={132} height={132} viewBox="0 0 132 132">
                {parsedMyooStrokes.map((stroke, index) => {
                  const points = stroke
                    .map((point) => `${point[0] * 104 + 14},${point[1] * 104 + 14}`)
                    .join(" ");
                  return (
                    <Polyline
                      key={`profile-stroke-${index}`}
                      points={points}
                      fill="none"
                      stroke="#334844"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </Svg>
            ) : (
              <Text style={styles.faceText}>☺</Text>
            )}
          </Pressable>
          <Text style={styles.myooHint}>Tap to edit</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={email}
            editable={false}
            style={[styles.input, styles.readOnlyInput]}
            placeholder="Email"
            placeholderTextColor="#6a726f"
          />
        </View>

        <Text style={styles.label}>Name</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6a726f"
          />
          <Text style={styles.editIcon}>✎</Text>
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#6a726f"
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.editIcon}>✎</Text>
        </View>

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await signOutUser();
            router.replace("/auth");
          }}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Modal
        visible={isEditorVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Your MYOO</Text>
            <View style={styles.modalCanvas} {...panResponder.panHandlers}>
              <Svg width={MYOO_EDITOR_SIZE} height={MYOO_EDITOR_SIZE}>
                {editorPreviewStrokes.map((stroke, index) => (
                  <Polyline
                    key={`editor-stroke-${index}`}
                    points={stroke.map((point) => `${point[0]},${point[1]}`).join(" ")}
                    fill="none"
                    stroke="#334844"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalGhostButton}
                onPress={() => {
                  setDraftStrokes([]);
                  activeStrokeRef.current = [];
                  setActiveStroke([]);
                }}
              >
                <Text style={styles.modalGhostText}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.modalGhostButton}
                onPress={() => {
                  activeStrokeRef.current = [];
                  setActiveStroke([]);
                  setIsEditorVisible(false);
                }}
              >
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveButton} onPress={applyEditor}>
                <Text style={styles.modalSaveText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 24,
  },
  headerRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#334844",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "400",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  title: {
    color: "#334844",
    fontSize: 42,
    fontWeight: "600",
    textAlign: "center",
  },
  label: {
    marginTop: 20,
    color: "#334844",
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 2,
  },
  inputRow: {
    marginTop: 6,
    backgroundColor: "#eef0be",
    borderRadius: 24,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#334844",
    fontSize: 20,
    fontWeight: "500",
  },
  readOnlyInput: {
    opacity: 0.85,
  },
  editIcon: {
    color: "#334844",
    fontSize: 22,
  },
  myooLabel: {
    alignSelf: "center",
    color: "#334844",
    fontSize: 20,
    fontWeight: "500",
  },
  myooSection: {
    marginTop: 18,
    marginBottom: 10,
  },
  myooFace: {
    marginTop: 10,
    width: 156,
    height: 156,
    borderRadius: 78,
    alignSelf: "center",
    backgroundColor: "#eef0be",
    alignItems: "center",
    justifyContent: "center",
  },
  myooHint: {
    marginTop: 8,
    alignSelf: "center",
    color: "#4f5f5a",
    fontSize: 13,
  },
  faceText: {
    fontSize: 62,
    color: "#334844",
  },
  error: {
    marginTop: 18,
    color: "#a53232",
    textAlign: "center",
  },
  saveButton: {
    marginTop: "auto",
    alignSelf: "center",
    backgroundColor: "#eef0be",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  saveText: {
    color: "#334844",
    fontSize: 20,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginTop: 14,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoutText: {
    color: "#334844",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 35, 33, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    backgroundColor: "#f1efd0",
    padding: 16,
  },
  modalTitle: {
    color: "#334844",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  modalCanvas: {
    marginTop: 12,
    width: MYOO_EDITOR_SIZE,
    height: MYOO_EDITOR_SIZE,
    borderRadius: 20,
    alignSelf: "center",
    backgroundColor: "#eef0be",
    overflow: "hidden",
  },
  modalButtons: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  modalGhostButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7d8b86",
    paddingVertical: 8,
    alignItems: "center",
  },
  modalGhostText: {
    color: "#334844",
    fontSize: 15,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#334844",
    paddingVertical: 8,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#eef0be",
    fontSize: 15,
    fontWeight: "700",
  },
});
