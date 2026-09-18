import Image from 'next/image';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';

import BookCard from '@/components/BookCard';
import { getAllBooks } from '@/lib/actions/book.actions';

export const dynamic = 'force-dynamic';

const formatDate = (value?: string | number | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="wrapper container flex flex-col items-center justify-center text-center">
        <h1 className="page-title">Your profile</h1>
        <p className="page-description">Sign in to see your account details and reading stats.</p>
        <Link href="/" className="btn-primary mt-6">
          Back to library
        </Link>
      </main>
    );
  }

  const bookResults = await getAllBooks();
  const books = bookResults.success ? bookResults.data ?? [] : [];

  const totalSegments = books.reduce((sum, book) => sum + (book.totalSegments ?? 0), 0);
  const totalMB = books.reduce((sum, book) => sum + (book.fileSize ?? 0), 0) / (1024 * 1024);

  const stats = [
    { label: 'Books', value: books.length },
    { label: 'Text segments', value: totalSegments.toLocaleString() },
    { label: 'Library size', value: `${totalMB.toFixed(1)} MB` },
  ];

  const details = [
    { label: 'Full name', value: user.fullName ?? '—' },
    { label: 'Email', value: user.primaryEmailAddress?.emailAddress ?? '—' },
    { label: 'Username', value: user.username ?? '—' },
    { label: 'Member since', value: formatDate(user.createdAt) },
    { label: 'Last signed in', value: formatDate(user.lastSignInAt) },
  ];

  return (
    <main className="wrapper container">
      <section className="library-hero-card mb-5 md:mb-9">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Image
            src={user.imageUrl}
            alt={user.fullName ?? 'Profile picture'}
            width={96}
            height={96}
            className="size-24 rounded-full object-cover shadow-soft"
          />
          <div className="text-center sm:text-left">
            <h1 className="section-title">{user.fullName ?? user.username ?? 'Reader'}</h1>
            <p className="text-[var(--text-secondary)]">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[14px] bg-white p-4 text-center">
              <p className="text-2xl font-semibold text-black">{stat.value}</p>
              <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-9 rounded-[14px] border border-[var(--border-subtle)] p-6">
        <h2 className="section-title mb-4">Account details</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-sm text-[var(--text-secondary)]">{detail.label}</dt>
              <dd className="font-medium text-black break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="section-title mb-4">Your books</h2>
        {books.length === 0 ? (
          <p className="text-[var(--text-secondary)]">
            No books yet.{' '}
            <Link href="/books/new" className="text-brand font-medium">
              Add your first one
            </Link>
            .
          </p>
        ) : (
          <div className="library-books-grid">
            {books.map((book) => (
              <BookCard
                key={book._id}
                title={book.title}
                author={book.author}
                coverURL={book.coverURL}
                slug={book.slug}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
