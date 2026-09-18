import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="wrapper container flex flex-col items-center justify-center text-center">
      <p className="text-6xl font-semibold text-[var(--color-brand)] font-serif">404</p>
      <h1 className="page-title mt-4">Page not found</h1>
      <p className="page-description max-w-md text-[var(--text-secondary)]">
        This page does not exist, or the book you were looking for is no longer in your library.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to library
        </Link>
        <Link href="/books/new" className="btn-secondary">
          Add a book
        </Link>
      </div>
    </main>
  );
}
