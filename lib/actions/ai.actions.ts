'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import connectToDatabase from '@/Database/mongoose';
import Book from '@/Database/models/book.model';
import BookSegment from '@/Database/models/bookSegment.model';
import { QuizQuestion } from '@/types';

const MAX_CONTEXT_CHARS = 30_000;

const askOpenAI = async (systemPrompt: string, userPrompt: string, asJson = false) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        ...(asJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch (error) {
    console.error('OpenAI request failed', error);
    throw new Error('The AI could not respond right now');
  }

  if (!response.ok) {
    console.error('OpenAI request failed', response.status, await response.text());
    throw new Error('The AI could not respond right now');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('The AI returned an empty response');

  return content as string;
};

const getUserBook = async (bookId: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await connectToDatabase();
  const book = await Book.findOne({ _id: bookId, clerkId: userId }).lean();
  if (!book) throw new Error('Book not found');

  return book;
};

const joinSegments = (segments: { content: string }[]) =>
  segments
    .map((segment) => segment.content)
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const generateSummary = async (bookId: string) => {
  try {
    const book = await getUserBook(bookId);
    if (book.summary) return { success: true as const, summary: book.summary as string };

    // ponytail: summarises the opening of the book only; map-reduce over all segments if the tail matters
    const segments = await BookSegment.find({ bookId })
      .select({ content: 1, _id: 0 })
      .sort({ segmentIndex: 1 })
      .limit(40)
      .lean();

    if (segments.length === 0) throw new Error('This book has no readable text yet');

    const summary = await askOpenAI(
      'You summarise books for readers. Reply with 2 short paragraphs, then a line "Key takeaways:" followed by 3 bullet points starting with "- ". No markdown headings.',
      `Summarise "${book.title}" by ${book.author} from these excerpts:\n\n${joinSegments(segments)}`,
    );

    await Book.updateOne({ _id: bookId }, { summary });

    return { success: true as const, summary };
  } catch (error) {
    console.error('Summary generation failed', error);
    return { success: false as const, error: getErrorMessage(error, 'Could not summarise this book') };
  }
};

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string().default(''),
      }),
    )
    .min(1)
    .max(5),
});

export const generateQuiz = async (bookId: string) => {
  try {
    const book = await getUserBook(bookId);

    // Random sample so "quiz me again" pulls from a different part of the book.
    const segments = await BookSegment.aggregate<{ content: string }>([
      { $match: { bookId } },
      { $sample: { size: 12 } },
      { $project: { content: 1, _id: 0 } },
    ]);

    if (segments.length === 0) throw new Error('This book has no readable text yet');

    const raw = await askOpenAI(
      'You write reading-comprehension quizzes. Return JSON: {"questions":[{"question":string,"options":[4 strings],"answerIndex":0-3,"explanation":string}]}. Exactly 5 questions, each answerable from the excerpts alone.',
      `Write a quiz on "${book.title}" by ${book.author} from these excerpts:\n\n${joinSegments(segments)}`,
      true,
    );

    const { questions } = quizSchema.parse(JSON.parse(raw));

    return { success: true as const, questions: questions as QuizQuestion[] };
  } catch (error) {
    console.error('Quiz generation failed', error);
    return { success: false as const, error: getErrorMessage(error, 'Could not build a quiz for this book') };
  }
};
