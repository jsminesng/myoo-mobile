# Supabase Setup Guide

This folder contains the backend setup for the Diary app.

## What is Included

- `schema.sql`: base table schema
- `functions/diary-chat/index.ts`: Gemini proxy Edge Function

## 1) Prerequisites

- Supabase project created
- Supabase CLI installed and logged in

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

## 2) Apply Database Schema

### Option A: SQL Editor (quick)

Copy `supabase/schema.sql` and run it in Supabase Dashboard SQL Editor.

### Option B: CLI migration (recommended)

```bash
supabase migration new init_schema
```

Paste the schema into the generated migration file, then:

```bash
SUPABASE_DB_PASSWORD='<your-db-password>' supabase db push
```

## 2.5) Enable Auth

In Supabase Dashboard:

- Authentication -> Providers -> Email enabled
- Turn off "Confirm email" for easier local testing (optional)

## 3) Create Storage Bucket

Create bucket `diary-media` in Storage.

- Current app expects public URLs for rendering uploaded media.
- If you use another bucket name, update `REACT_APP_SUPABASE_MEDIA_BUCKET`.

## 4) Configure Frontend Env

Use project root `.env.local`:

```bash
REACT_APP_SUPABASE_URL=https://<your-project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your_anon_key>
REACT_APP_SUPABASE_DIARY_TABLE=diary_entries
REACT_APP_SUPABASE_MEDIA_BUCKET=diary-media
```

## 5) Deploy Gemini Edge Function

Set Gemini key as Supabase secret (server-side only):

```bash
supabase secrets set GEMINI_API_KEY=<your_gemini_api_key>
```

Deploy function:

```bash
supabase functions deploy diary-chat --no-verify-jwt
```

Function URL:

```text
https://<your-project-ref>.supabase.co/functions/v1/diary-chat
```

## 6) Verify

- `diary_entries` table exists
- `chat_logs` table exists
- `profiles` table exists
- `diary-media` bucket exists
- `diary-chat` function deployed
- You can sign up/sign in and finish onboarding
- Frontend can save only the signed-in user's entries and chat logs, and receive chat responses

