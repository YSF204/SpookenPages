'use client';

import { Loader2, Mic, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Messages } from '@/types';

interface TranscriptProps {
  messages: Messages[];
  currentMessage: Messages | null;
  currentUserMessage: Messages | null;
  bookId: string;
  isVoiceLive?: boolean;
}

const Transcript = ({
  messages,
  currentMessage,
  currentUserMessage,
  bookId,
  isVoiceLive = false,
}: TranscriptProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
    setSpeakingIndex(null);
  };

  // A live call would echo the playback into the mic, so cut it off. Also runs on unmount.
  useEffect(() => {
    if (isVoiceLive) stopAudio();
  }, [isVoiceLive]);

  useEffect(() => () => stopAudio(), []);

  // ponytail: audio is re-fetched on every replay; cache the blob per message if that gets costly
  const toggleSpeech = async (index: number, text: string) => {
    const wasSpeaking = speakingIndex === index;
    stopAudio();
    if (wasSpeaking || loadingIndex !== null) return;

    setLoadingIndex(index);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, text }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error ?? 'Could not read this message aloud');
      }

      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.onended = stopAudio;
      audioRef.current = audio;
      await audio.play();
      setSpeakingIndex(index);
    } catch (error) {
      console.error('Text-to-speech error', error);
      toast.error(error instanceof Error ? error.message : 'Could not read this message aloud');
    } finally {
      setLoadingIndex(null);
    }
  };
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

            {!isUser && !isVoiceLive && (
              <button
                type="button"
                onClick={() => void toggleSpeech(index, message.content)}
                className="transcript-speak-btn"
                disabled={loadingIndex !== null}
                aria-label={
                  speakingIndex === index ? 'Stop reading this message' : 'Read this message aloud'
                }
              >
                {loadingIndex === index ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : speakingIndex === index ? (
                  <Square className="size-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-4" aria-hidden="true" />
                )}
              </button>
            )}
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
