'use client'

import { Mic, MicOff } from 'lucide-react'
import { IBook } from '@/types'
import useVapi from '@/hooks/useVapi'
import Image from 'next/image'
import Transcript from '@/components/Transcript'

const VapiControls = ({book} : {book: IBook}) => {
    const { status, isActive, messages, currentMessage, currentUserMessage, start, stop, limitError } = useVapi(book);
    const isAiProcessing = status === 'thinking' || status === 'speaking';
  return (
    <>

<section className="vapi-header-card w-full">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL}
              alt={`Cover of ${book.title}`}
              width={120}
              height={180}
              className="vapi-cover-image !h-[180px] !w-[120px]"
              priority
            />
            <div className="vapi-mic-wrapper">
              {isAiProcessing && (
                <span className="vapi-pulse-ring" aria-hidden="true" />
              )}
              <button
                onClick={() => (isActive ? stop() : start())}
                disabled={status === 'connecting' || status === 'starting'}
                type="button"
                className={`vapi-mic-btn ${
                  isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'
                }`}
                aria-label={isActive ? 'Stop conversation' : 'Start conversation'}
              >
                {isActive ? (
                  <Mic className="size-6 text-white" aria-hidden="true" />
                ) : (
                  <MicOff className="size-6 text-[#212a3b]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-bold leading-tight text-[#212a3b] sm:text-3xl">
              {book.title}
            </h1>
            <p className="mt-1 text-base text-[#3d485e]">by {book.author}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="vapi-status-indicator">
                <span className={`vapi-status-dot vapi-status-dot-${status}`} aria-hidden="true" />
                <span className="vapi-status-text">{status}</span>
              </span>
              <span className="vapi-badge-ai vapi-badge-ai-text">Voice: {book.persona || 'Default'}</span>
              <span className="vapi-badge-ai vapi-badge-ai-text inline-flex items-center gap-1.5">
                0:00/15:00
              </span>
            </div>
            {limitError && (
              <p className="mt-3 text-sm text-red-600" role="alert">{limitError}</p>
            )}
          </div>
        </section>


        <section className="vapi-transcript-wrapper mt-4" aria-label="Conversation transcript">
          <div className="transcript-container">
            <Transcript
              messages={messages}
              currentMessage={currentMessage}
              currentUserMessage={currentUserMessage}
            />
          </div>
        </section>
    
    </>
   
  )
}

export default VapiControls
