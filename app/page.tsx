import EReader from "@/component/EReader";

export default function Home() {
  return (
    <div className="h-screen">
      <EReader initialSrc="/books/example.epub" />
    </div>
  );
}
