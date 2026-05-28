import { isSupabaseConfigured, supabase } from "./supabaseClient";

const DIARY_TABLE = "diary_entries";

export type DiaryEntry = {
  id: string;
  date: string;
  word: string;
  feeling: string | null;
  note: string;
  media: string | null;
  mediaType: string | null;
};

const mapRowToEntry = (row: any): DiaryEntry => ({
  id: row.id,
  date: row.date || "",
  word: row.word || "",
  feeling: row.feeling || null,
  note: row.note || "",
  media: row.media_url || null,
  mediaType: row.media_type || null,
});

const getCurrentUserId = async () => {
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
};

export const getDiaryEntries = async (): Promise<DiaryEntry[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from(DIARY_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToEntry);
};

