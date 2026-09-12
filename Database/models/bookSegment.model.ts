import { models, Schema, model } from "mongoose";
import { IBookSegment } from "@/types";

const bookSegmentSchema = new Schema<IBookSegment>(
    {
        clerkId: { type: String, required: true },
        bookId: { type: String, ref: "Book", required: true , index : true },
        content: { type: String, required: true },
        segmentIndex: { type: Number, required: true , index :true },
        pageNumber: { type: Number, required: false, index :true },
        wordCount: { type: Number, required: true },
    },
    { timestamps: true }
);
bookSegmentSchema.index({bookId: 1, segmentIndex: 1}, {unique: true});
bookSegmentSchema.index({bookId: 1, pageNumber: 1});
bookSegmentSchema.index({bookId: 1, content: 'text'});
const BookSegment = models.BookSegment || model<IBookSegment>("BookSegment", bookSegmentSchema);

export default BookSegment;
