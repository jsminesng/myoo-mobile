import { isSupabaseConfigured, supabase } from "./supabaseClient";

const normalizeDiaryEntry = (diaryEntry) => {
  if (!diaryEntry) return null;

  return {
    date: diaryEntry.date || "",
    word: diaryEntry.word || diaryEntry.text || "",
    note: diaryEntry.note || "",
  };
};

export const invokeDiaryChat = async ({ mode, userMessage, diaryEntry }) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("diary-chat", {
    body: {
      mode,
      userMessage: userMessage || "",
      diaryEntry: normalizeDiaryEntry(diaryEntry),
    },
  });

  if (error) {
    throw error;
  }

  if (!data || typeof data.text !== "string") {
    throw new Error("Invalid response from diary-chat function.");
  }

  return data.text.trim();
};

