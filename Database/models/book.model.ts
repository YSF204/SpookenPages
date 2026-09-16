import { models, Schema,model } from "mongoose";
import { IBook } from "@/types";


const bookSchema = new Schema<IBook>({
    _id: { type: String, required: true },
    clerkId: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true, trim: true},
    author: { type: String, required: true , trim: true },
    persona: { type: String, required: false },
    summary: { type: String, required: false },
    fileURL: { type: String, required: true },
    fileBlobKey: { type: String, required: true },
    coverURL: { type: String, required: true },
    coverBlobKey: { type: String, required: false },
    fileSize: { type: Number, required: true },
    totalSegments: { type: Number, required: true, default: 0 },    
}, { timestamps: true });

bookSchema.index({ clerkId: 1, slug: 1 }, { unique: true });

const Book = models.Book || model<IBook>("Book", bookSchema);

export default Book;
