import { models, Schema, model } from "mongoose";
import { IVoiceSession } from "@/types";

const voiceSessionSchema = new Schema<IVoiceSession>(
    {
        clerkId: { type: String, required: true , index : true },
        bookId: { type: String, ref: "Book", required: true , index : true },
        startedAt: { type: Date, required: true  ,default: Date.now},
        endedAt: { type: Date, required: false },
        durationSeconds: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

const VoiceSession = models.VoiceSession || model<IVoiceSession>("VoiceSession", voiceSessionSchema);

export default VoiceSession;
