'use server';

import connectToDatabase from "@/Database/mongoose";
import VoiceSession from "@/Database/models/voiceSession.model";
import { EndSessionResult, StartSessionResult } from "@/types";
import { auth } from "@clerk/nextjs/server";

export const startVoiceSession = async (bookId: string):Promise<StartSessionResult> =>{

    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Unauthorized" };

        await connectToDatabase();

        const session = await VoiceSession.create({clerkId: userId,bookId,startedAt: new Date(), durationSeconds: 0})

        return {
            success: true,
            sessionId: session._id.toString(),
        }
        
    } catch (error){
        console.error("Error starting voice session", error);
        return {
            success: false,
            error: "An error occurred while starting the voice session",
        }
    }

}

export const endVoiceSession = async (
    sessionId: string,
    durationSeconds: number,
): Promise<EndSessionResult> => {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Unauthorized" };

        await connectToDatabase();
        const session = await VoiceSession.findByIdAndUpdate(
            { _id: sessionId, clerkId: userId },
            {
                endedAt: new Date(),
                durationSeconds,
            },
            { new: true },
        );

        if(!session){
            return {
                success: false,
                error: "Session not found",
            }
        }

        return { success: Boolean(session) };
    } catch (error) {
        console.error("Error ending voice session", error);
        return { success: false };
    }
};
