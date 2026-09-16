'use client';

import { Mic } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Messages } from '@/types';

interface TranscriptProps {
  messages: Messages[];
  currentMessage: Messages | null;
  currentUserMessage: Messages | null;
}

const Transcript = ({
  messages,
  currentMessage,
  currentUserMessage,
}: TranscriptProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasConversation =
    messages.length > 0 || currentMessage !== null || currentUserMessage !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage, currentUserMessage]);

  if (!hasConversation) {
    return (
      <div className="transcript-empty">
        <Mic className="mb-4 size-12 text-[#8b7355]" aria-hidden="true" />
        <p className="transcript-empty-text">No conversation yet</p>
        <p className="transcript-empty-hint">
          Click the mic button to talk, or type a message below
        </p>
      </div>
    );
  }

  return (
    <div className="transcript-messages" role="log" aria-live="polite">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div
            key={`${message.role}-${index}`}
            className={`transcript-message ${
              isUser ? 'transcript-message-user' : 'transcript-message-assistant'
            }`}
          >
            <div
              className={`transcript-bubble whitespace-pre-wrap ${
                isUser ? 'transcript-bubble-user' : 'transcript-bubble-assistant'
              }`}
            >
              {message.content}
            </div>
          </div>
        );
      })}

      {currentMessage && (
        <div className="transcript-message transcript-message-assistant">
          <div className="transcript-bubble transcript-bubble-assistant whitespace-pre-wrap">
            {currentMessage.content}
            <span className="transcript-cursor" aria-hidden="true" />
          </div>
        </div>
      )}

      {currentUserMessage && (
        <div className="transcript-message transcript-message-user">
          <div className="transcript-bubble transcript-bubble-user whitespace-pre-wrap">
            {currentUserMessage.content}
            <span className="transcript-cursor" aria-hidden="true" />
          </div>
        </div>
      )}

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
};

export default Transcript;
