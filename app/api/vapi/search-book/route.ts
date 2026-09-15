import { NextResponse } from 'next/server';

import { searchBookSegments } from '@/lib/actions/book.actions';

const NO_INFORMATION_FOUND = 'no information found about this topic';

export async function POST(request: Request) {
  const { message } = await request.json();
  const results = await Promise.all(
    message.toolCallList
      .filter((toolCall: { function: { name: string } }) => toolCall.function.name === 'search book')
      .map(async (toolCall: { id: string; function: { arguments: { bookId: string; query: string } } }) => {
        const { bookId, query } = toolCall.function.arguments;
        const segments = await searchBookSegments(bookId, query, 3);

        return {
          toolCallId: toolCall.id,
          result: segments.length
            ? segments.map((segment) => segment.content).join('\n\n')
            : NO_INFORMATION_FOUND,
        };
      }),
  );

  return NextResponse.json({ results });
}
