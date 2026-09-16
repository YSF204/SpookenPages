# Spoken Pages

Upload a PDF, then talk to it — out loud in real time, or by typing. Answers are grounded in the book's own text, not the model's memory.

## Features

- **Realtime voice chat** — speak to the book, hear it answer in an ElevenLabs voice (via Vapi). Live transcript.
- **Text chat** — type instead, same conversation thread. Replies are retrieved from the book's indexed text (RAG) before the model answers.
- **Read aloud** — speaker icon on any reply, spoken in the book's own persona voice.
- **Summary** — generated once per book and cached.
- **Quiz me** — 5 multiple-choice questions drawn at random from anywhere in the book, graded inline with explanations.

Voice and text are mutually exclusive: starting a call pauses typing, and sending a message ends a live call. You're told which way you just switched.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, lucide-react, sonner |
| Auth | Clerk |
| Database | MongoDB + Mongoose |
| File storage | Vercel Blob |
| PDF parsing | pdfjs-dist (runs in the browser) |
| Realtime voice | Vapi (`@vapi-ai/web`) |
| Text / summary / quiz | OpenAI `gpt-4o-mini` |
| Speech playback | ElevenLabs |

## Getting started

**Prerequisites:** Node 20+, a MongoDB instance, and accounts for Clerk, Vercel Blob, Vapi, OpenAI, and ElevenLabs.

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (`/sign-up`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post-sign-in redirect |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post-sign-up redirect |
| `MONGO_URI` | MongoDB connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
| `NEXT_PUBLIC_VAPI_API_KEY` | Vapi **public** web key (browser SDK) |
| `NEXT_PUBLIC_ASSISTANT_ID` | Vapi assistant ID |
| `VAPI_WEBHOOK_SECRET` | Shared secret validating Vapi's tool-call webhook |
| `OPENAI_API_KEY` | Text chat, summary, quiz |
| `ELEVENLABS_API_KEY` | Read-aloud playback |

### Vapi assistant setup

The voice assistant is configured in the **Vapi dashboard**, not in this repo. It needs:

- A tool named **`search book`** with a POST webhook to `https://<your-host>/api/vapi/search-book`, sending header `x-vapi-secret: <VAPI_WEBHOOK_SECRET>`.
- Tool arguments: `bookId`, `query`, `sessionId`.
- Template variables available to the prompt: `title`, `author`, `bookId`, `sessionId` (passed at call start).

Without this, voice calls connect but the assistant can't read the book.

## How it works

**Upload** — the browser parses the PDF with pdfjs-dist, splits it into ~500-word segments (50-word overlap, page numbers preserved), uploads the file and cover straight to Vercel Blob, then persists the segments to MongoDB with a full-text index.

**Voice** — the browser opens a Vapi call directly. When the assistant needs the book, it calls its `search book` tool, which hits `/api/vapi/search-book`. That route verifies the secret *and* that the `sessionId` maps to an active `VoiceSession` for that book before running the search.

**Text** — `POST /api/chat` authenticates with Clerk, confirms the book belongs to the caller, runs a `$text` search for the top 3 relevant segments, and sends them to OpenAI as grounding context.

```
PDF ─► pdfjs (browser) ─► segments ─► MongoDB ($text index)
                                          │
        voice ──► Vapi assistant ──► /api/vapi/search-book ──┤
        text  ──► /api/chat ──► $text search ──► OpenAI ──────┘
```

Voice and text are independently grounded — neither falls back to the other.

**Summary / quiz** — server actions in `lib/actions/ai.actions.ts`. Summary reads the book's opening segments and is cached on the Book document. The quiz pulls a random `$sample` of 12 segments, so re-rolling gives questions from a different part of the book; the model's JSON output is zod-validated before rendering.

## Project structure

```
app/
  (root)/books/[slug]/   book page: voice, chat, summary, quiz
  (root)/books/new/      upload flow
  api/chat/              text chat (OpenAI + RAG)
  api/tts/               ElevenLabs speech
  api/upload/            Vercel Blob upload handler
  api/vapi/search-book/  Vapi tool-call webhook
components/              UI (vapiControls, Transcript, BookExtras, UploadForm)
hooks/useVapi.ts         call lifecycle, transcript, text sending
lib/actions/             server actions (book, session, ai)
lib/constants.ts         voice IDs and settings
Database/                Mongoose models + connection
```

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

## Known limits

- **Chat history is not persisted** — reloading the book page clears the conversation.
- **Summaries cover the book's opening only** (~5,000 words), not the full text.
- **Read-aloud audio isn't cached** — replaying a message re-requests it from ElevenLabs.
- **The `0:00/15:00` session timer on the book page is a placeholder** and isn't wired to real duration.
