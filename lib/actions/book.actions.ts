'use server';

import { randomUUID } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { del } from '@vercel/blob';
import { z } from 'zod';

import { CreateBook, TextSegment } from '@/types';
import { connectToDatabase } from '@/Database/mongoose';
import Book from '@/Database/models/book.model';
import { generateSlug, serializeData } from '@/lib/utils';
import BookSegment from '@/Database/models/bookSegment.model';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

type SerializedBook = {
  _id: string;
  slug: string;
  [key: string]: unknown;
};

type CheckBookExistsResult =
  | { exists: true; book: SerializedBook }
  | { exists: false; error?: string };

type CreateBookResult =
  | { success: true; book: SerializedBook; alreadyExists: true }
  | { success: true; book: SerializedBook; alreadyExists?: false }
  | { success: false; error: string };

const createBookSchema = z.object({
  title: z.string().trim().min(1),
  author: z.string().trim().min(1),
  persona: z.string().optional(),
  fileURL: z.string().url(),
  fileBlobKey: z.string().min(1),
  coverURL: z.string().url(),
  coverBlobKey: z.string().min(1).optional(),
  fileSize: z.number().positive(),
});

const textSegmentSchema = z.object({
  text: z.string(),
  segmentIndex: z.number().int().nonnegative(),
  pageNumber: z.number().int().nonnegative().optional(),
  wordCount: z.number().int().nonnegative(),
});

const deleteBlobKeys = async (keys: string[]) => {
  if (keys.length === 0) return;
  try {
    await del(keys);
  } catch (error: unknown) {
    console.error('Failed to delete uploaded blobs', error);
  }
};

const getBlobKeys = (data: Pick<CreateBook, 'fileBlobKey' | 'coverBlobKey'>) =>
  [data.fileBlobKey, data.coverBlobKey].filter(
    (key): key is string => Boolean(key),
  );

export const deleteUploadedBlobs = async (keys: string[]) => {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const parsed = z.array(z.string().min(1)).safeParse(keys);
  if (!parsed.success) return { success: false, error: 'Invalid blob keys' };

  await connectToDatabase();
  const owned = await Book.find({
    clerkId: userId,
    $or: [
      { fileBlobKey: { $in: parsed.data } },
      { coverBlobKey: { $in: parsed.data } },
    ],
  })
    .select({ fileBlobKey: 1, coverBlobKey: 1 })
    .lean();
  const ownedKeys = new Set(
    owned.flatMap((book) => [book.fileBlobKey, book.coverBlobKey]),
  );
  const transientKeys = parsed.data.filter((key) => key.startsWith(`${userId}/`));
  await deleteBlobKeys(
    parsed.data.filter((key) => ownedKeys.has(key) || transientKeys.includes(key)),
  );
  return { success: true };
};

export const checkBookExists = async (title: string): Promise<CheckBookExistsResult> => {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Title is required');
    }

    await connectToDatabase();
    const slug = generateSlug(title);
    if (!slug) throw new Error('Title must contain at least one letter or number');
    const existingBook = await Book.findOne({ slug, clerkId: userId }).lean();

    if (existingBook) {
      return { exists: true, book: serializeData(existingBook) };
    }

    return { exists: false };
  } catch (error: unknown) {
    console.error(error);
    return {
      exists: false,
      error: getErrorMessage(error, 'Failed to check whether the book exists'),
    };
  }
};

export const createBook = async (data: CreateBook): Promise<CreateBookResult> => {
  const blobKeys = getBlobKeys(data);
  let userId: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) throw new Error('Unauthorized');

    const validatedData = createBookSchema.parse(data);
    await connectToDatabase();
    const slug = generateSlug(validatedData.title);
    if (!slug) {
      throw new Error('Title must contain at least one letter or number');
    }

    const existingBook = await Book.findOne({ slug, clerkId: userId }).lean();
    if (existingBook) {
      await deleteBlobKeys(blobKeys);
      return {
        success: true,
        book: serializeData(existingBook),
        alreadyExists: true,
      };
    }

    const book = await Book.create({
      ...validatedData,
      clerkId: userId,
      _id: randomUUID(),
      slug,
      totalSegments: 0,
    });
    return { success: true, book: serializeData(book) };
  } catch (error: unknown) {
    console.error(error);
    if (userId) await deleteBlobKeys(blobKeys);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to create book'),
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  segments: TextSegment[],
  blobKeys: string[] = [],
) => {
  let ownedBookId: string | null = null;
  let ownedUserId: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    if (typeof bookId !== 'string' || bookId.trim().length === 0) {
      throw new Error('Invalid book ID');
    }

    const validatedSegments = z.array(textSegmentSchema).parse(segments);
    await connectToDatabase();
    const ownedBook = await Book.findOne({ _id: bookId, clerkId: userId })
      .select({ _id: 1 })
      .lean();
    if (!ownedBook) throw new Error('Unauthorized');
    ownedBookId = bookId;
    ownedUserId = userId;

    console.log('Saving book segments ... ');
    const segmentsToInsert = validatedSegments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        clerkId: userId,
        bookId,
        content: text,
        segmentIndex,
        pageNumber,
        wordCount,
      }),
    );
    await BookSegment.insertMany(segmentsToInsert);
    await Book.findOneAndUpdate(
      { _id: bookId, clerkId: userId },
      { totalSegments: validatedSegments.length },
    );
    console.log('Book segments saved successfully');
    return {
      success: true,
      message: 'Book segments saved successfully',
      data: {
        segmentsCreated: validatedSegments.length,
        totalSegments: validatedSegments.length,
      },
    };
  } catch (error: unknown) {
    console.error(error);
    if (ownedBookId && ownedUserId) {
      await BookSegment.deleteMany({ bookId: ownedBookId, clerkId: ownedUserId });
      await Book.findOneAndDelete({ _id: ownedBookId, clerkId: ownedUserId });
      await deleteBlobKeys(blobKeys);
      console.log('Owned book and segments deleted due to a failure');
    }
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to save book segments'),
    };
  }
};

export const getAllBooks = async () => {
  try {
    const { userId } = await auth();
    if (!userId) return { success: true as const, data: [] };

    await connectToDatabase();
    const books = await Book.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, data: serializeData(books) };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to get all books'),
    };
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    const { userId } = await auth();
    if (!userId) return { success: true as const, data: null };
    if (typeof slug !== 'string' || slug.trim().length === 0) {
      return { success: true as const, data: null };
    }

    await connectToDatabase();
    const book = await Book.findOne({ slug: slug.trim(), clerkId: userId }).lean();

    return { success: true as const, data: book ? serializeData(book) : null };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false as const,
      error: getErrorMessage(error, 'Failed to get book'),
      data: null,
    };
  }
};

export const searchBookSegments = async (
  bookId: string,
  query: string,
  numberOfSegments = 3,
) => {
  if (typeof bookId !== 'string' || bookId.trim().length === 0) {
    throw new Error('Book ID is required');
  }
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query is required');
  }

  await connectToDatabase();

  const segments = await BookSegment.find(
    { bookId: bookId.trim(), $text: { $search: query.trim() } },
    { content: 1, segmentIndex: 1, _id: 0, score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(numberOfSegments)
    .lean();

  if (segments.length > 0) return segments;

  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return BookSegment.find({
    bookId: bookId.trim(),
    content: { $regex: escapedQuery, $options: 'i' },
  })
    .select({ content: 1, segmentIndex: 1, _id: 0 })
    .sort({ segmentIndex: 1 })
    .limit(numberOfSegments)
    .lean();
};
