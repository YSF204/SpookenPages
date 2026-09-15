import { NextResponse } from 'next/server';
import { z } from 'zod';

import connectToDatabase from '@/Database/mongoose';
import VoiceSession from '@/Database/models/voiceSession.model';
import { searchBookSegments } from '@/lib/actions/book.actions';

const NO_INFORMATION_FOUND = 'no information found about this topic';
const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  arguments: z.object({
    bookId: z.string().min(1),
    query: z.string().min(1),
    sessionId: z.string().min(1),
  }),
});

const requestSchema = z.object({
  message: z.object({
    type: z.literal('tool-calls'),
    toolCallList: z.array(toolCallSchema),
  }),
});

export async function POST(request: Request) {
  if (request.headers.get('x-vapi-secret') !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid Vapi tool call' }, { status: 400 });
  }

  const results = await Promise.all(
    body.message.toolCallList
      .filter((toolCall) => toolCall.name === 'search book')
      .map(async (toolCall) => {
        try {
          const { bookId: requestedBookId, query, sessionId } = toolCall.arguments;
          await connectToDatabase();
          const session = await VoiceSession.findOne({
            _id: sessionId,
            endedAt: null,
          }).select({ bookId: 1 }).lean();

          if (!session || session.bookId !== requestedBookId) {
            throw new Error('Book is not permitted for this voice session');
          }

          const segments = await searchBookSegments(session.bookId, query, 3);
          return {
            toolCallId: toolCall.id,
            result: segments.length
              ? segments.map((segment) => segment.content).join('\n\n')
              : NO_INFORMATION_FOUND,
          };
        } catch (error) {
          return {
            toolCallId: toolCall.id,
            result: error instanceof Error ? error.message : 'Search failed',
            error: true,
          };
        }
      }),
  );

  return NextResponse.json({ results });
}
