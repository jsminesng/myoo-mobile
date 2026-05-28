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

export const saveChatLog = async (params: {
  entryId?: string | null;
  mode: string;
  userMessage: string;
  aiMessage: string;
}) => {
  if (!isSupabaseConfigured || !supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase.from(CHAT_LOGS_TABLE).insert({
    user_id: userId,
    entry_id: params.entryId || null,
    mode: params.mode,
    user_message: params.userMessage,
    ai_message: params.aiMessage,
  });
  if (error) throw error;
};

