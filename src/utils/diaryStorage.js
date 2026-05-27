import {
  clearDiaryEntries as clearLocalDiaryEntries,
  deleteDiaryEntry as deleteLocalDiaryEntry,
  getDiaryEntries as getLocalDiaryEntries,
  saveDiaryEntry as saveLocalDiaryEntry,
} from "./localStorage";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const DIARY_TABLE = process.env.REACT_APP_SUPABASE_DIARY_TABLE || "diary_entries";
const MEDIA_BUCKET = process.env.REACT_APP_SUPABASE_MEDIA_BUCKET || "diary-media";

const mapRowToEntry = (row) => ({
  id: row.id?.toString() || Date.now().toString(),
  date: row.date || "",
  word: row.word || "",
  feeling: row.feeling || null,
  note: row.note || "",
  media: row.media_url || row.media || null,
  mediaType: row.media_type || row.mediaType || null,
});

const uploadMediaIfNeeded = async (file, entryId) => {
  if (!file || !supabase) return { mediaUrl: null, mediaType: null };

  const sanitizedName = (file.name || "media-file").replace(/\s+/g, "-");
  const filePath = `${entryId}/${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

  return {
    mediaUrl: data.publicUrl,
    mediaType: file.type || null,
  };
};

export const saveDiaryEntry = async (entry) => {
  if (!isSupabaseConfigured || !supabase) {
    return saveLocalDiaryEntry(entry);
  }

  try {
    const entryId =
      entry.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString());

    const { mediaUrl, mediaType } = await uploadMediaIfNeeded(entry.media, entryId);

    const payload = {
      id: entryId,
      date: entry.date || null,
      word: entry.word || null,
      feeling: entry.feeling || null,
      note: entry.note || "",
      media_url: mediaUrl,
      media_type: mediaType,
    };

    const { data, error } = await supabase
      .from(DIARY_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return mapRowToEntry(data);
  } catch (error) {
    console.error("Supabase save failed. Falling back to localStorage.", error);
    return saveLocalDiaryEntry(entry);
  }
};

export const getDiaryEntries = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalDiaryEntries();
  }

  try {
    const { data, error } = await supabase
      .from(DIARY_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToEntry);
  } catch (error) {
    console.error("Supabase read failed. Falling back to localStorage.", error);
    return getLocalDiaryEntries();
  }
};

export const deleteDiaryEntry = async (id) => {
  if (!isSupabaseConfigured || !supabase) {
    return deleteLocalDiaryEntry(id);
  }

  try {
    const { error } = await supabase.from(DIARY_TABLE).delete().eq("id", id);
    if (error) throw error;
    return getDiaryEntries();
  } catch (error) {
    console.error("Supabase delete failed. Falling back to localStorage.", error);
    return deleteLocalDiaryEntry(id);
  }
};

export const clearDiaryEntries = async () => {
  if (!isSupabaseConfigured || !supabase) {
    clearLocalDiaryEntries();
    return;
  }

  try {
    const { error } = await supabase.from(DIARY_TABLE).delete().neq("id", "");
    if (error) throw error;
  } catch (error) {
    console.error("Supabase clear failed. Falling back to localStorage.", error);
    clearLocalDiaryEntries();
  }
};

