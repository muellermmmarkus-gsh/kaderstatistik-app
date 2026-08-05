import Link from "next/link";

export default function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
    >
      ← Zurück
    </Link>
  );
}
