import { NextResponse } from 'next/server';
import { z } from 'zod';

import connectToDatabase from '@/Database/mongoose';
import VoiceSession from '@/Database/models/voiceSession.model';
import { searchBookSegments } from '@/lib/actions/book.actions';

const NO_INFORMATION_FOUND = 'no information found about this topic';
const toolCallSchema = z.looseObject({
  id: z.string().min(1),
});

// Vapi sends the call as either {id, name, arguments} or {id, function: {name,
// arguments}}, and arguments is sometimes a JSON string. Accept all of them.
const getQuery = (toolCall: Record<string, any>) => {
  const raw = toolCall.arguments ?? toolCall.function?.arguments;
  const args = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const query = typeof args?.query === 'string' ? args.query.trim() : '';
  if (!query) throw new Error('Tool call is missing a query');
  return query;
};

// The assistant only supplies the query: bookId and sessionId come from the call
// itself, so the model never has to know (or say out loud) either id. Vapi puts
// those variables in different places depending on the message, so look in all of
// them rather than pinning one path.
const variablesSchema = z.object({
  bookId: z.string().min(1),
  sessionId: z.string().min(1),
});

const requestSchema = z.looseObject({
  message: z.looseObject({
    type: z.literal('tool-calls'),
    toolCallList: z.array(toolCallSchema),
  }),
});

const findVariables = (message: Record<string, unknown>) => {
  const call = message.call as Record<string, any> | undefined;
  const candidates = [
    call?.assistantOverrides?.variableValues,
    (message.artifact as Record<string, any> | undefined)?.variableValues,
    call?.artifact?.variableValues,
  ];

  for (const candidate of candidates) {
    const parsed = variablesSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return null;
};

export async function POST(request: Request) {
  if (request.headers.get('x-vapi-secret') !== process.env.VAPI_WEBHOOK_SECRET) {
    console.error('Vapi tool call rejected: x-vapi-secret header did not match', {
      headerPresent: request.headers.has('x-vapi-secret'),
      secretConfigured: Boolean(process.env.VAPI_WEBHOOK_SECRET),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();

  let body;
  try {
    body = requestSchema.parse(payload);
  } catch (error) {
    console.error('Vapi tool call payload rejected', error, JSON.stringify(payload).slice(0, 2000));
    return NextResponse.json({ error: 'Invalid Vapi tool call' }, { status: 400 });
  }

  const variables = findVariables(body.message);
  if (!variables) {
    console.error(
      'Vapi tool call is missing bookId/sessionId variables',
      JSON.stringify(payload).slice(0, 2000),
    );
    return NextResponse.json({ error: 'Missing call variables' }, { status: 400 });
  }
  const { bookId: requestedBookId, sessionId } = variables;

  const results = await Promise.all(
    body.message.toolCallList
      .map(async (toolCall) => {
        try {
          const query = getQuery(toolCall);
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
