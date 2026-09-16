import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import connectToDatabase from '@/Database/mongoose';
import Book from '@/Database/models/book.model';
import { DEFAULT_VOICE, VOICE_SETTINGS, voiceOptions } from '@/lib/constants';

const requestSchema = z.object({
  bookId: z.string().min(1),
  text: z.string().min(1).max(1500),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured' }, { status: 500 });
  }

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid speech request' }, { status: 400 });
  }

  await connectToDatabase();
  const book = await Book.findOne({ _id: body.bookId, clerkId: userId })
    .select({ persona: 1 })
    .lean()
    .catch(() => null);

  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

  // Same voice the book uses in voice chat, so typed replies sound identical.
  const voice = voiceOptions[book.persona as keyof typeof voiceOptions] ?? voiceOptions[DEFAULT_VOICE];

  let response: Response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          text: body.text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: VOICE_SETTINGS.stability,
            similarity_boost: VOICE_SETTINGS.similarityBoost,
            style: VOICE_SETTINGS.style,
            use_speaker_boost: VOICE_SETTINGS.useSpeakerBoost,
            speed: VOICE_SETTINGS.speed,
          },
        }),
      },
    );
  } catch (error) {
    console.error('ElevenLabs TTS request failed', error);
    return NextResponse.json({ error: 'Could not read this message aloud' }, { status: 502 });
  }

  if (!response.ok || !response.body) {
    console.error('ElevenLabs TTS failed', response.status, await response.text());
    return NextResponse.json({ error: 'Could not read this message aloud' }, { status: 502 });
  }

  return new Response(response.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}
