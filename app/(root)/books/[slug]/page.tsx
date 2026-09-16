

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

import { getBookBySlug } from '@/lib/actions/book.actions';
import VapiControls from '@/components/vapiControls';
import BookExtras from '@/components/BookExtras';

export default async function BookPage({
  params,
}: PageProps<'/books/[slug]'>) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success || !result.data) redirect('/');

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>

      <div className="vapi-main-container">
        {/* Book header section: cover, conversation control, and book metadata. */}
    

        {/* Transcript section: conversation history and empty state. */}
        <VapiControls book={result.data} />

        {/* Summary and quiz, generated from the book's stored segments. */}
        <BookExtras book={result.data} />
      </div>
    </main>
  );
}
