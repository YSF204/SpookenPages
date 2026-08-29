import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Upload your book",
    description: "Add a PDF to your personal library",
  },
  {
    number: 2,
    title: "Get a summary",
    description: "AI generates a smart overview of your book",
  },
  {
    number: 3,
    title: "Start talking",
    description: "Have voice conversations with your book",
  },
] as const;

export function LibraryHero() {
  return (
    <section className="library-hero-card mb-5 md:mb-9">

      <div className="library-hero-illustration-desktop" aria-hidden>
        <Image
          src="/assets/hero-illustration.png"
          alt=""
          width={491}
          height={352}
          className="h-[240px] w-auto object-contain xl:h-[280px]"
          priority
        />
      </div>

      <div className="library-hero-content">
        <div className="library-hero-text">
          <h1 className="library-hero-title">Your Library</h1>
          <p className="library-hero-description">
            Manage your books and turn them into interactive AI conversations.
          </p>
          <Link href="/upload" className="library-cta-primary">
            <Plus className="size-5 md:size-6" strokeWidth={2.5} />
            Add New Book
          </Link>
        </div>

        <div className="library-hero-illustration">
          <Image
            src="/assets/hero-illustration.png"
            alt="Vintage books, globe, and desk lamp"
            width={491}
            height={352}
            className="h-[180px] w-auto object-contain sm:h-[220px]"
            priority
          />
        </div>

        <div className="library-steps-card">
          {STEPS.map((step) => (
            <div key={step.number} className="library-step-item">
              <span className="library-step-number">{step.number}</span>
              <div>
                <p className="library-step-title">{step.title}</p>
                <p className="library-step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

   
    </section>
  );
}
