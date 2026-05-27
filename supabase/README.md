## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a Storage bucket named `diary-media` (or set `REACT_APP_SUPABASE_MEDIA_BUCKET`).
4. Set the bucket to public for direct image/video rendering in the current app.
5. Copy `.env.example` to `.env` and fill in your project values.
6. Restart the React dev server.

## Edge Function for Gemini

1. Install and login Supabase CLI.
2. Link project:
   - `supabase link --project-ref <your-project-ref>`
3. Set secret for Gemini API key:
   - `supabase secrets set GEMINI_API_KEY=<your_gemini_api_key>`
4. Deploy function:
   - `supabase functions deploy diary-chat --no-verify-jwt`
5. Confirm function URL:
   - `https://<your-project-ref>.supabase.co/functions/v1/diary-chat`

The web app now calls this function via `supabase.functions.invoke("diary-chat")`.

