import {
  clearDiaryEntries as clearLocalDiaryEntries,
  deleteDiaryEntry as deleteLocalDiaryEntry,
  getDiaryEntries as getLocalDiaryEntries,
  saveDiaryEntry as saveLocalDiaryEntry,
} from "./localStorage";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const DIARY_TABLE = process.env.REACT_APP_SUPABASE_DIARY_TABLE || "diary_entries";
const MEDIA_BUCKET = process.env.REACT_APP_SUPABASE_MEDIA_BUCKET || "diary-media";

const getSupabaseErrorSummary = (error) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  const parts = [
    error.message ? `message=${error.message}` : null,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : JSON.stringify(error);
};

const getCurrentUserId = async () => {
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
};

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
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You must be signed in to upload media.");
  }

  const sanitizedName = (file.name || "media-file").replace(/\s+/g, "-");
  const filePath = `${userId}/${entryId}/${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    const message = uploadError?.message || "";
    const isBucketMissing =
      message.toLowerCase().includes("bucket not found") ||
      uploadError?.statusCode === "404";

    if (isBucketMissing) {
      console.warn(
        `Storage bucket '${MEDIA_BUCKET}' not found. Saving diary entry without media.`,
      );
      return { mediaUrl: null, mediaType: null };
    }

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
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("User is not authenticated.");
    }

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
      user_id: userId,
    };

    const { data, error } = await supabase
      .from(DIARY_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return mapRowToEntry(data);
  } catch (error) {
    console.error(
      "Supabase save failed.",
      getSupabaseErrorSummary(error),
    );
    throw error;
  }
};

export const getDiaryEntries = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalDiaryEntries();
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from(DIARY_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToEntry);
  } catch (error) {
    console.error(
      "Supabase read failed.",
      getSupabaseErrorSummary(error),
    );
    return [];
  }
};

export const deleteDiaryEntry = async (id) => {
  if (!isSupabaseConfigured || !supabase) {
    return deleteLocalDiaryEntry(id);
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { error } = await supabase
      .from(DIARY_TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return getDiaryEntries();
  } catch (error) {
    console.error(
      "Supabase delete failed.",
      getSupabaseErrorSummary(error),
    );
    throw error;
  }
};

export const clearDiaryEntries = async () => {
  if (!isSupabaseConfigured || !supabase) {
    clearLocalDiaryEntries();
    return;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error } = await supabase
      .from(DIARY_TABLE)
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  } catch (error) {
    console.error(
      "Supabase clear failed.",
      getSupabaseErrorSummary(error),
    );
    throw error;
  }
};

