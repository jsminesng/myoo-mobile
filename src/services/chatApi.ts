import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const invokeDiaryChat = async ({
  mode,
  userMessage,
  diaryEntry,
}: {
  mode: string;
  userMessage: string;
  diaryEntry?: { date?: string; word?: string; note?: string } | null;
}) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("diary-chat", {
    body: {
      mode,
      userMessage,
      diaryEntry: diaryEntry ?? null,
    },
  });

  if (error) throw error;
  return data?.text || "";
};

