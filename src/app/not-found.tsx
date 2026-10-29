import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-xl px-4 py-28 text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-3 text-[3.25rem]">This page isn&rsquo;t in the collection.</h1>
        <p className="mt-4 text-muted">It may have moved, or it never existed.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-solid">Home</Link>
          <Link href="/search" className="btn btn-outline">Search</Link>
        </div>
      </div>
    </div>
  );
}
