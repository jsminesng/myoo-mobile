# Diary App

Emotion-based diary web app built with React.

## Tech Stack

- React (CRA)
- CSS
- Supabase (Database, Storage, Edge Functions)
- Gemini API (called from Supabase Edge Function)

## Features

- Save diary entries with word, feeling image, note, and media
- View diary entries in bubbles and detail screen
- Chat assistant with 3 modes:
  - Clear advice
  - Supportive messages
  - Write apologies for me
- Selected diary context is passed into chat

## Project Structure

- `src/pages`: screen-level components
- `src/components`: UI components
- `src/utils/diaryStorage.js`: diary CRUD abstraction (Supabase first, local fallback)
- `src/utils/chatApi.js`: Edge Function chat invocation
- `supabase/`: SQL schema + function source

## Environment Variables

Create `.env.local` in project root:

```bash
REACT_APP_SUPABASE_URL=https://<your-project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your_supabase_anon_key>
REACT_APP_SUPABASE_DIARY_TABLE=diary_entries
REACT_APP_SUPABASE_MEDIA_BUCKET=diary-media
```

See `.env.example` for reference.

## Run Locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Supabase Setup

Detailed setup is in `supabase/README.md`.

Quick flow:

1. Create Supabase project
2. Run `supabase/schema.sql` (or migration + `supabase db push`)
3. Create storage bucket `diary-media`
4. Deploy function `diary-chat`
5. Set function secret `GEMINI_API_KEY`

## Security Note

- Do not put Gemini API keys in frontend env vars.
- Keep Gemini key only in Supabase function secret:
  - `supabase secrets set GEMINI_API_KEY=<your_key>`
