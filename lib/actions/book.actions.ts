
'use server';

import { randomUUID } from 'node:crypto';

import { CreateBook , TextSegment } from "@/types";
import { connectToDatabase } from "@/Database/mongoose";
import Book from "@/Database/models/book.model";
import { generateSlug, serializeData } from "@/lib/utils";
import BookSegment from "@/Database/models/bookSegment.model";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const checkBookExists = async (title : string) =>{
     try {  
        await connectToDatabase();
        const slug = generateSlug(title);
        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook){
            return {
                exists : true , book : serializeData(existingBook),
            };
        }

        return {        
            exists : false ,
        }
     } catch (error: unknown) {
        console.error(error);
        return {
            exists: false,
            error: getErrorMessage(error, 'Failed to check whether the book exists'),
        }
     }
}
export const createBook = async (data:CreateBook) =>{
    try {
        await connectToDatabase();
        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({slug}).lean();
        if(existingBook){
            return { 
                success: true,
                book: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        const book = await Book.create({
            ...data,
            _id: randomUUID(),
            slug,
            totalSegments: 0,
        });
        return {
             success : true,
             book : serializeData(book),
        }
    } catch (error: unknown) {
        console.error(error);
        return {    
            success: false,
            error: getErrorMessage(error, 'Failed to create book'),
        }
    }
};

export const saveBookSegments = async (bookId : string , clerkId: string , segments : TextSegment[]) =>{
    try { 
        await connectToDatabase();
        // Remove the legacy unique index. It may remain in MongoDB after the
        // schema changes, especially while the model is cached in dev mode.
        try {
            await BookSegment.collection.dropIndex('bookId_1_pageNumber_1');
        } catch (error: unknown) {
            const code = (error as { code?: number }).code;
            if (code !== 27) {
                throw error;
            }
        }
        await BookSegment.collection.createIndex(
            { bookId: 1, pageNumber: 1 },
            { name: 'bookId_1_pageNumber_1' },
        );


        console.log("Saving book segments ... ");

        const segmentsToInsert = segments.map(({text , segmentIndex, pageNumber, wordCount}) =>({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount

        }));
        await BookSegment.insertMany(segmentsToInsert);
        await Book.findByIdAndUpdate(bookId, {totalSegments: segments.length});
        console.log('Book segments saved successfully');
        return {
            success: true,
            message: 'Book segments saved successfully',
            data: {segmentsCreated : segments.length, totalSegments: segments.length}
        }

        
    } catch (error: unknown) {
        console.error(error);
        await BookSegment.deleteMany({bookId});
        await Book.findByIdAndDelete(bookId);
        console.log('Book and segments deleted and book due a failure');
        return {
            success: false,
            error: getErrorMessage(error, 'Failed to save book segments'),
        }
    }

};

export const getAllBooks = async () =>{
    try { 
        await connectToDatabase();
        const books = await Book.find().sort({createdAt: -1}).lean();

        return {
            success: true,
            data: serializeData(books),
        }
    } catch (error: unknown) {
        console.error(error);
        return {
            success: false,
            error: getErrorMessage(error, 'Failed to get all books'),
        }
    }
}
