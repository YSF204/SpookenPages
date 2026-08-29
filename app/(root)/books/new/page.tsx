import UploadForm from "@/components/UploadForm";

export default function Page() {
  return (
    <main className="new-book">
      <div className="new-book-wrapper">
        <section className="flex flex-col gap-5">
          <h1 className="page-title-xl">New Book</h1>
          <p className="subtitle">
            Upload a PDF to generate interactive interviews
          </p>
        </section>
        <UploadForm />
      </div>
    </main>
  );
}
