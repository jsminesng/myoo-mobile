import { isSupabaseConfigured, supabase } from "./supabaseClient";

const CHAT_LOGS_TABLE = "chat_logs";

const getCurrentUserId = async () => {
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
};

const formatError = (error) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return [
    error.message ? `message=${error.message}` : null,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
};

export const saveChatLog = async ({
  entryId = null,
  mode = "free_chat",
  userMessage,
  aiMessage,
}) => {
  if (!isSupabaseConfigured || !supabase) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const payload = {
    user_id: userId,
    entry_id: entryId,
    mode,
    user_message: userMessage || "",
    ai_message: aiMessage || "",
  };

  const { error } = await supabase.from(CHAT_LOGS_TABLE).insert(payload);
  if (error) {
    console.error("Failed to save chat log:", formatError(error));
    throw error;
  }

  return true;
};

