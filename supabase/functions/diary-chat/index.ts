// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const getDiaryContext = (diaryEntry: any) => {
  if (!diaryEntry) return "";

  const date = diaryEntry.date || "";
  const word = diaryEntry.word || "";
  const note = diaryEntry.note || "";

  if (!date && !word && !note) return "";

  return `Diary Entry:
Date: ${date}
Word: ${word}
Note: ${note}`;
};

const buildPrompt = ({
  mode,
  userMessage,
  diaryEntry,
}: {
  mode: string;
  userMessage: string;
  diaryEntry?: any;
}) => {
  const context = getDiaryContext(diaryEntry);
  const base = `You are a helpful diary assistant.
Keep your response concise but complete.
Usually respond in 2-3 short sentences.
Do not use markdown formatting, bullets, or headings.
Use plain conversational tone.
Always end with a complete sentence. Never end mid-sentence.`;

  if (mode === "clear_advice") {
    return `${base}
${context ? `${context}\n` : ""}
Give clear and practical advice based on the diary context.
If diary context is missing, give general practical advice.
User request: ${userMessage}`;
  }

  if (mode === "supportive_messages") {
    return `${base}
${context ? `${context}\n` : ""}
Respond with warm, empathetic, supportive messages.
User request: ${userMessage}`;
  }

  if (mode === "write_apologies") {
    return `${base}
${context ? `${context}\n` : ""}
Write a sincere apology message the user can send.
If context is unclear, write a neutral apology.
User request: ${userMessage}`;
  }

  return `${base}
${context ? `${context}\n` : ""}
Answer the user's question using the diary context when relevant.
User question: ${userMessage}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY secret in Edge Function.");
    }

    const body = await req.json();
    const mode = body?.mode || "free_chat";
    const userMessage = body?.userMessage || "";
    const diaryEntry = body?.diaryEntry || null;

    const prompt = buildPrompt({ mode, userMessage, diaryEntry });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 260,
          },
        }),
      },
    );

    const geminiData = await geminiResponse.json();
    let text =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim() || "";

    // Guard against responses that end mid-sentence.
    if (text && !/[.!?。！？]$/.test(text)) {
      const completed = text.match(/^(.*[.!?。！？])[^.!?。！？]*$/s)?.[1]?.trim();
      text = completed || `${text}.`;
    }

    if (!text) {
      throw new Error("Gemini returned empty text.");
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

