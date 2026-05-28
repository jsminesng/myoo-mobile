import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { invokeDiaryChat } from "@/services/chatApi";
import { saveChatLog } from "@/services/chatStorage";

type ChatMessage = { id: string; role: "user" | "ai"; text: string };

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "init", role: "ai", text: "Hi there! What do you need today?" },
  ]);

  const sendMessage = async (mode: string, content: string) => {
    if (!content.trim()) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", text: content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const text = await invokeDiaryChat({
        mode,
        userMessage: content,
        diaryEntry: null,
      });
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        role: "ai",
        text,
      };
      setMessages((prev) => [...prev, aiMessage]);
      await saveChatLog({
        mode,
        userMessage: content,
        aiMessage: text,
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-err`, role: "ai", text: "Failed to connect AI service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => sendMessage("clear_advice", "Clear advice")}>
          <Text style={styles.actionText}>Clear advice</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => sendMessage("supportive_messages", "Supportive messages")}
        >
          <Text style={styles.actionText}>Supportive messages</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => sendMessage("write_apologies", "Write apologies for me")}>
          <Text style={styles.actionText}>Write apologies</Text>
        </Pressable>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.message, item.role === "user" ? styles.user : styles.ai]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type message"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#364c41", paddingTop: 56, paddingHorizontal: 16 },
  back: { color: "#ffffc6", fontSize: 16, marginBottom: 12 },
  actions: { gap: 8, marginBottom: 12 },
  actionButton: { backgroundColor: "#ffcfed", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  actionText: { color: "#364c41", fontWeight: "600" },
  message: { borderRadius: 12, padding: 10, maxWidth: "85%" },
  user: { alignSelf: "flex-end", backgroundColor: "#ffcfed" },
  ai: { alignSelf: "flex-start", backgroundColor: "#ffffc6" },
  messageText: { color: "#364c41" },
  inputRow: { flexDirection: "row", gap: 8, paddingBottom: 24, paddingTop: 8 },
  input: { flex: 1, backgroundColor: "#ffffc6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  send: { backgroundColor: "#ffcfed", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  sendText: { color: "#364c41", fontWeight: "700" },
});

