"use client"

import { IBook , Messages} from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { ASSISTANT_ID, DEFAULT_VOICE } from "@/lib/constants";
import Vapi from "@vapi-ai/web";

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

const useLatestRef = <T>(value: T) => {
    const ref = useRef<T>(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}
const VAPI_API_KEY= process.env.NEXT_PUBLIC_VAPI_API_KEY;
let vapi: InstanceType<typeof Vapi>;

function getVAPI () {

    if(!vapi){
        if(!VAPI_API_KEY){
            throw new Error("your api key is not found in the .env file , Please set it in the .env file");
        }
        vapi = new Vapi(VAPI_API_KEY);

    }

    return vapi;
}

export const useVapi = (book: IBook) =>{
    const{userId} = useAuth()
    
    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setmessages] = useState<Messages[]>([]);
    const [currentMessage, setcurrentMessage] = useState<Messages | null>(null);
    const [currentUserMessage, setcurrentUserMessage] = useState<Messages | null>(null);
    const [duration, setduration] = useState(0);
    const [limitError, setlimitError] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isStoppingRef = useRef<boolean>(false);

    const bookRef = useLatestRef(book);
    
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;
    
    
    const isActive = status == "listening" || status == "thinking" || status == "speaking";
    
// limits 


//     const maxDurationRef = useLatestRef(limits.maxSessionDurationMinutes * 60);
//     const maxDurationSeconds
//     const remainingSeconds
//     const ShowTimeWarning


    useEffect(() => {
        if (!VAPI_API_KEY) return;

        const client = getVAPI();
        const handleCallStart = () => setStatus("listening");
        const handleSpeechStart = () => setStatus("speaking");
        const handleSpeechEnd = () => setStatus("listening");
        const handleCallEnd = () => setStatus("idle");
        const handleMessage = (message: unknown) => {
            if (!message || typeof message !== "object") return;

            const event = message as Record<string, unknown>;
            if (
                event.type !== "transcript" ||
                (event.role !== "user" && event.role !== "assistant") ||
                (event.transcriptType !== "partial" && event.transcriptType !== "final") ||
                typeof event.transcript !== "string"
            ) {
                return;
            }

            const transcriptMessage: Messages = {
                role: event.role,
                content: event.transcript,
            };

            if (event.transcriptType === "partial") {
                if (event.role === "user") {
                    setcurrentUserMessage(transcriptMessage);
                } else {
                    setcurrentMessage(transcriptMessage);
                }
                return;
            }

            setmessages((currentMessages) =>
                currentMessages.some(
                    (current) =>
                        current.role === transcriptMessage.role &&
                        current.content === transcriptMessage.content
                )
                    ? currentMessages
                    : [...currentMessages, transcriptMessage]
            );

            if (event.role === "user") {
                setcurrentUserMessage(null);
                setStatus("thinking");
            } else {
                setcurrentMessage(null);
                setStatus("listening");
            }
        };
        const handleError = (error: unknown) => {
            console.error("Vapi error", error);
            setStatus("idle");
            setlimitError("The voice session could not start");
        };

        client.on("call-start", handleCallStart);
        client.on("speech-start", handleSpeechStart);
        client.on("speech-end", handleSpeechEnd);
        client.on("call-end", handleCallEnd);
        client.on("message", handleMessage);
        client.on("error", handleError);

        return () => {
            client.removeListener("call-start", handleCallStart);
            client.removeListener("speech-start", handleSpeechStart);
            client.removeListener("speech-end", handleSpeechEnd);
            client.removeListener("call-end", handleCallEnd);
            client.removeListener("message", handleMessage);
            client.removeListener("error", handleError);
        };
    }, []);

    const start = async () => {
        if (!userId) {
            setlimitError("You must be logged in to start a conversation");
            return;
        }

        setlimitError(null);
        setStatus("connecting");

        try {
            const firstMessage = `Hey, nice to meet you , and I'm here to help you read and understand the book ${book.title}.`;

            await getVAPI().start(ASSISTANT_ID,{
                firstMessage,
                variableValues :{
                    title : book.title, author : book.author, bookId: book._id,
                }
            })
        } catch (error){
            console.error(error);
            setStatus("idle");
            setlimitError(error instanceof Error ? error.message : "An error occurred while connecting to the server");
        }
    }
    const stop = async () =>{
        isStoppingRef.current = true;
        await getVAPI().stop();
    };
    const clearErrors = () => setlimitError(null);

    return {
        status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
        clearErrors,
        limitError,
         //maxDurationSeconds
        //remainingSeconds
        //ShowTimeWarning

    }


}

export default useVapi;
