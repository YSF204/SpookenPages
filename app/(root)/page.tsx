import { LibraryHero } from "@/components/library-hero";
import { sampleBooks } from "@/lib/constants";
import BookCard from "@/components/BookCard";

export default function Page() {
  return (
    <main className="wrapper pt-[94px] pb-18 min-h-screen">
      <LibraryHero />

      <div className="library-books-grid">
        {sampleBooks.map((book) =>{
            return <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
        })}
      </div>

    </main>
  );
}
