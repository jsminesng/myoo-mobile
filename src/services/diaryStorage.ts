import { isSupabaseConfigured, supabase } from "./supabaseClient";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

const DIARY_TABLE = "diary_entries";
const MEDIA_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_MEDIA_BUCKET || "diary-media";

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

export const uploadDiaryMedia = async (params: { uri: string; mediaType: "image" | "video" }) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not found.");

  const uri = params.uri;
  const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const fallbackExt = params.mediaType === "video" ? "mp4" : "jpg";
  const ext = (extMatch?.[1] || fallbackExt).toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const base64File = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileArrayBuffer = decode(base64File);
  const contentType =
    params.mediaType === "video"
      ? "video/mp4"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, fileArrayBuffer, {
      upsert: false,
      contentType,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const createDiaryEntry = async (params: {
  word?: string;
  note?: string;
  feeling?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  date?: string;
}) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not found.");

  const payload = {
    user_id: userId,
    date: params.date || new Date().toISOString().slice(0, 10),
    word: params.word || "",
    feeling: params.feeling ?? null,
    note: params.note || "",
    media_url: params.mediaUrl || null,
    media_type: params.mediaType || null,
  };

  const { data, error } = await supabase.from(DIARY_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return mapRowToEntry(data);
};

