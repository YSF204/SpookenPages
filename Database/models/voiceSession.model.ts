import { models, Schema, model } from "mongoose";
import { IVoiceSession } from "@/types";

const voiceSessionSchema = new Schema<IVoiceSession>(
    {
        _id: { type: String, required: true },
        clerkId: { type: String, required: true , index : true },
        bookId: { type: String, ref: "Book", required: true , index : true },
        startedAt: { type: Date, required: true  ,default: Date.now},
        endedAt: { type: Date, required: false },
        durationSeconds: { type: Number, required: true, default: 0 },
        billingPeriodStart: { type: Date, required: true  , index : true},
    },
    { timestamps: true }
);

voiceSessionSchema.index({clerkId: 1, billingPeriodStart: 1}, {unique: true});

const VoiceSession = models.VoiceSession || model<IVoiceSession>("VoiceSession", voiceSessionSchema);

export default VoiceSession;
