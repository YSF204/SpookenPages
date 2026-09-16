import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import connectToDatabase from '@/Database/mongoose';
import Book from '@/Database/models/book.model';
import { searchBookSegments } from '@/lib/actions/book.actions';

const requestSchema = z.object({
  bookId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
  }

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid chat request' }, { status: 400 });
  }

  await connectToDatabase();
  const book = await Book.findOne({ _id: body.bookId, clerkId: userId })
    .select({ title: 1, author: 1 })
    .lean()
    .catch(() => null);

  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

  const question = body.messages.findLast((message) => message.role === 'user')?.content;
  const segments = question
    ? await searchBookSegments(body.bookId, question, 3).catch(() => [])
    : [];
  const context = segments.map((segment) => segment.content).join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the book "${book.title}" by ${book.author}, talking with a reader. Answer using the excerpts below and say plainly when they do not cover the question. Keep replies under 150 words.\n\nExcerpts:\n${context || 'no information found about this topic'}`,
        },
        ...body.messages,
      ],
    }),
  });

  if (!response.ok) {
    console.error('OpenAI chat failed', response.status, await response.text());
    return NextResponse.json({ error: 'The book could not answer right now' }, { status: 502 });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return NextResponse.json({ error: 'The book had nothing to say' }, { status: 502 });

  return NextResponse.json({ message: { role: 'assistant', content } });
}
