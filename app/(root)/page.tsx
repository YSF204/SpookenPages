import { LibraryHero } from "@/components/library-hero";
import BookCard from "@/components/BookCard";
import { getAllBooks } from "@/lib/actions/book.actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const bookResults= await getAllBooks();

  if (!bookResults.success) {
    throw new Error(bookResults.error);
  }

  const books = bookResults.data ?? [];

  return (
    <main className="wrapper pt-[94px] pb-18 min-h-screen">
      <LibraryHero />

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
    </main>
  );
}
