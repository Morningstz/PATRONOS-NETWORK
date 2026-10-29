import Link from "next/link";

export const metadata = { title: "Access denied", robots: { index: false } };

export default function Forbidden() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">403</p>
      <h1 className="display mt-3 text-[3rem]">You don&rsquo;t have access to this page.</h1>
      <p className="mt-4 text-muted">If you think this is a mistake, contact your PATRONOS administrator.</p>
      <Link href="/" className="btn btn-outline mt-8">Back home</Link>
    </div>
  );
}
