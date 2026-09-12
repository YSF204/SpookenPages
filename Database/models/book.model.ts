import { models, Schema,model } from "mongoose";
import { IBook } from "@/types";


const bookSchema = new Schema<IBook>({
    _id: { type: String, required: true },
    clerkId: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true , unique: true, lowercase: true, trim: true},
    author: { type: String, required: true , trim: true },
    persona: { type: String, required: false },
    fileURL: { type: String, required: true },
    fileBlobKey: { type: String, required: true },
    coverURL: { type: String, required: true },
    coverBlobKey: { type: String, required: false },
    fileSize: { type: Number, required: true },
    totalSegments: { type: Number, required: true, default: 0 },    
}, { timestamps: true });

const Book = models.Book || model<IBook>("Book", bookSchema);

export default Book;