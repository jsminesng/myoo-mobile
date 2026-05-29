import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getCurrentUser, upsertProfile } from "@/services/auth";

type Step = 0 | 1 | 2;
type FaceType = "none" | "smile" | "wink" | "flat";

function FacePreview({ faceType }: { faceType: FaceType }) {
  const isPlaceholder = faceType === "none";
  const isWink = faceType === "wink";
  const isFlat = faceType === "flat";

  return (
    <View style={styles.faceArea}>
      <View style={styles.eyesRow}>
        <View style={[styles.eye, isPlaceholder && styles.eyePlaceholder, isWink && styles.eyeWink]} />
        <View style={[styles.eye, isPlaceholder && styles.eyePlaceholder]} />
      </View>
      <View
        style={[
          styles.mouth,
          isPlaceholder && styles.mouthPlaceholder,
          isFlat && styles.mouthFlat,
        ]}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [faceType, setFaceType] = useState<FaceType>("none");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const trimmedName = name.trim();
  const canGoNextFromName = trimmedName.length > 0;
  const canFinish = faceType !== "none" && !saving;

  const nextDisabled = useMemo(() => {
    if (step === 1) return !canGoNextFromName;
    if (step === 2) return !canFinish;
    return false;
  }, [canFinish, canGoNextFromName, step]);

  const cycleFace = () => {
    setFaceType((prev) => {
      if (prev === "none") return "smile";
      if (prev === "smile") return "wink";
      if (prev === "wink") return "flat";
      return "smile";
    });
  };

  const finishOnboarding = async () => {
    try {
      setSaving(true);
      setErrorText("");
      const user = await getCurrentUser();
      if (!user?.id) throw new Error("User not found.");
      await upsertProfile({
        userId: user.id,
        displayName: trimmedName || "User",
        onboardingCompleted: true,
      });
      router.replace("/home");
    } catch (error: any) {
      setErrorText(error?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onNext = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!canGoNextFromName) return;
      setStep(2);
      return;
    }
    if (!canFinish) return;
    await finishOnboarding();
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
        {step === 0 && (
          <View style={styles.centerBlock}>
            <Text style={styles.heroText}>
              Welcome to{"\n"}MYOO.{"\n"}Let's take{"\n"}care of your{"\n"}day together.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.centerBlock}>
            <Text style={styles.title}>What should I{"\n"}call you?</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder=" "
                placeholderTextColor="#9a9a8a"
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={onNext}
              />
              <Pressable
                style={[styles.inlineArrowButton, !canGoNextFromName && styles.buttonDisabled]}
                onPress={onNext}
                disabled={!canGoNextFromName}>
                <Text style={styles.inlineArrow}>→</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.centerBlock}>
            <Text style={styles.title}>Give your{"\n"}MYOO a face!</Text>
            <Pressable style={styles.faceCard} onPress={cycleFace}>
              <FacePreview faceType={faceType} />
            </Pressable>
            <Text style={styles.helper}>Tap face to change expression</Text>
          </View>
        )}

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <View style={styles.bottomRow}>
          <Pressable
            style={[styles.nextButton, nextDisabled && styles.buttonDisabled]}
            onPress={onNext}
            disabled={nextDisabled}>
            <Text style={styles.nextButtonText}>{saving ? "Saving..." : "Next"}</Text>
            <Text style={styles.nextArrow}>→</Text>
          </Pressable>
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
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  centerBlock: {
    marginTop: 92,
    gap: 22,
  },
  heroText: {
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.6,
    color: "#253431",
    fontWeight: "600",
  },
  title: {
    fontSize: 46,
    lineHeight: 54,
    letterSpacing: -0.6,
    color: "#253431",
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#f5f4bd",
    paddingLeft: 16,
    paddingRight: 6,
    height: 58,
  },
  input: {
    flex: 1,
    fontSize: 34,
    color: "#253431",
    paddingVertical: 0,
  },
  inlineArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e4f3b8",
  },
  inlineArrow: {
    color: "#253431",
    fontSize: 26,
    lineHeight: 30,
  },
  faceCard: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 170,
  },
  faceArea: {
    width: 160,
    alignItems: "center",
    gap: 28,
  },
  eyesRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  eye: {
    width: 26,
    height: 12,
    borderTopWidth: 2.5,
    borderColor: "#253431",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  eyePlaceholder: {
    borderTopWidth: 2,
    borderStyle: "dashed",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderColor: "#d8c3bc",
  },
  eyeWink: {
    borderTopWidth: 0,
    borderBottomWidth: 2.5,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: 2,
  },
  mouth: {
    width: 86,
    height: 42,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: "#253431",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  mouthPlaceholder: {
    width: 92,
    height: 2,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d8c3bc",
    borderRadius: 0,
  },
  mouthFlat: {
    width: 84,
    height: 2,
    borderWidth: 0,
    borderBottomWidth: 3,
    borderColor: "#253431",
    borderRadius: 0,
  },
  helper: {
    color: "#5e6764",
    fontSize: 14,
  },
  bottomRow: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  nextButtonText: {
    color: "#253431",
    fontSize: 18,
    fontWeight: "500",
  },
  nextArrow: {
    color: "#253431",
    fontSize: 22,
    lineHeight: 24,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  error: {
    color: "#a53232",
    fontSize: 13,
  },
});

