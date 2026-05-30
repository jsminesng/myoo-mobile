import { getCurrentUser, getProfile } from "@/services/auth";
import { invokeDiaryChat } from "@/services/chatApi";
import { saveChatLog } from "@/services/chatStorage";
import { getDiaryEntries } from "@/services/diaryStorage";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChatMessage = { id: string; role: "user" | "ai" | "menu"; text: string };
const MYOO_FACE_URI =
  "file:///Users/seungeunsong/.cursor/projects/Users-seungeunsong-myoo/assets/___________2026-05-30_23.02.47-781b8380-44e6-4647-ad83-6fc8d1138c9b.png";

export default function ChatScreen() {
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("there");
  const [chatDiaryContext, setChatDiaryContext] = useState<{
    date?: string;
    word?: string;
    note?: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted || !user?.id) return;
        const [profile, diaryEntries] = await Promise.all([
          getProfile(user.id),
          getDiaryEntries(),
        ]);
        if (!mounted) return;
        setDisplayName(
          profile?.display_name || user.email?.split("@")[0] || "there",
        );
        const latestWithContent = diaryEntries.find(
          (entry) => entry.word?.trim() || entry.note?.trim(),
        );
        setChatDiaryContext(
          latestWithContent
            ? {
                date: latestWithContent.date || "",
                word: latestWithContent.word || "",
                note: latestWithContent.note || "",
              }
            : null,
        );
      } catch {
        // Keep default display name on profile load failure.
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sendMessage = async (mode: string, content: string) => {
    if (!content.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setTimeout(() => scrollToBottom(true), 40);
    setInput("");
    setLoading(true);
    try {
      const text = await invokeDiaryChat({
        mode,
        userMessage: content,
        diaryEntry: chatDiaryContext,
      });
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        role: "ai",
        text,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setTimeout(() => scrollToBottom(true), 40);
      await saveChatLog({
        mode,
        userMessage: content,
        aiMessage: text,
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "ai",
          text: "Failed to connect AI service.",
        },
      ]);
      setTimeout(() => scrollToBottom(true), 40);
    } finally {
      setLoading(false);
    }
  };

  const appendQuickMenuMessage = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-menu-${Math.random().toString(36).slice(2, 6)}`,
        role: "menu",
        text: "",
      },
    ]);
    setTimeout(() => scrollToBottom(true), 40);
  };

  useEffect(() => {
    appendQuickMenuMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        style={styles.messagesList}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator
        scrollEnabled
        renderItem={({ item }) =>
          item.role === "menu" ? (
            <View style={styles.heroRow}>
              <View style={styles.heroFaceCircle}>
                <Image
                  source={{ uri: MYOO_FACE_URI }}
                  style={styles.heroFaceImage}
                  contentFit="cover"
                />
              </View>
              <View style={styles.heroBubbleWrap}>
                <View style={styles.heroBubbleTail} />
                <View style={styles.heroCard}>
                  <Text style={styles.heroTitle}>Hi {displayName}!</Text>
                  <Text style={styles.heroSubtitle}>
                    What do you need today?
                  </Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() =>
                        sendMessage("clear_advice", "Clear advice")
                      }
                    >
                      <Text style={styles.actionText}>Clear advice</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() =>
                        sendMessage(
                          "supportive_messages",
                          "Supportive messages",
                        )
                      }
                    >
                      <Text style={styles.actionText}>Supportive messages</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() =>
                        sendMessage("write_apologies", "Write apologies for me")
                      }
                    >
                      <Text style={styles.actionText}>
                        Write apologies for me
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ) : item.role === "ai" ? (
            <View style={styles.aiMessageRow}>
              <Pressable
                style={styles.aiFaceCircle}
                onPress={appendQuickMenuMessage}
              >
                <Image
                  source={{ uri: MYOO_FACE_URI }}
                  style={styles.aiFaceImage}
                  contentFit="cover"
                />
              </Pressable>
              <View style={styles.aiBubbleWrap}>
                <View style={styles.aiBubbleTail} />
                <View style={[styles.message, styles.ai]}>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.message, styles.user]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          )
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder=""
          style={styles.input}
        />
        <Pressable
          style={[styles.send, loading && { opacity: 0.5 }]}
          disabled={loading}
          onPress={() => sendMessage("free_chat", input)}
        >
          <Text style={styles.sendText}>{loading ? "..." : "Send"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#35554b", paddingHorizontal: 16 },
  topBar: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
  },
  back: { color: "#f2f0bd", fontSize: 50, lineHeight: 40, marginTop: -6 },
  heroRow: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  heroFaceCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e8bcde",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    overflow: "hidden",
  },
  heroFaceImage: {
    width: "100%",
    height: "100%",
  },
  heroCard: {
    backgroundColor: "#eef0be",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroBubbleWrap: {
    flex: 1,
    position: "relative",
  },
  heroBubbleTail: {
    position: "absolute",
    left: -8,
    top: 22,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#eef0be",
    zIndex: 2,
  },
  heroTitle: {
    color: "#2d4741",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 2,
    color: "#2d4741",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  actions: { gap: 8, marginTop: 8 },
  actionButton: {
    backgroundColor: "#e8bcde",
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  actionText: {
    color: "#2d4741",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  messagesList: { flex: 1 },
  messagesContent: { gap: 14, paddingBottom: 12 },
  message: { borderRadius: 12, padding: 10, maxWidth: "85%" },
  user: { alignSelf: "flex-end", backgroundColor: "#e8bcde" },
  ai: {
    alignSelf: "flex-start",
    backgroundColor: "#eef0be",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageText: { color: "#2d4741", fontSize: 15, lineHeight: 22 },
  aiMessageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  aiFaceCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e8bcde",
    overflow: "hidden",
    marginTop: 10,
  },
  aiFaceImage: {
    width: "100%",
    height: "100%",
  },
  aiBubbleWrap: {
    flex: 1,
    position: "relative",
  },
  aiBubbleTail: {
    position: "absolute",
    left: -8,
    top: 18,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#eef0be",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 18,
    paddingTop: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#eef0be",
    borderRadius: 28,
    paddingHorizontal: 14,
    height: 46,
    color: "#2d4741",
    fontSize: 17,
  },
  send: {
    backgroundColor: "#e8bcde",
    borderRadius: 24,
    paddingHorizontal: 22,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#2d4741", fontWeight: "700", fontSize: 17 },
});
