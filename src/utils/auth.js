import { isSupabaseConfigured, supabase } from "./supabaseClient";

const PROFILES_TABLE = "profiles";

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const onAuthStateChange = (callback) => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
};

export const signUpWithEmail = async (email, password) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email, password) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getProfile = async (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) return null;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertProfile = async ({
  userId,
  displayName,
  onboardingCompleted = true,
}) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    id: userId,
    display_name: displayName || null,
    onboarding_completed: onboardingCompleted,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

