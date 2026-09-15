import Link from "next/link";

// Admin paneli kasıtlı olarak sade/nötr bırakıldı — katılımcı tarafındaki
// premium koyu tema burada yok, işlevsellik öncelikli. Kök layout'taki koyu
// body arka planını burada eziyoruz.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="border-b border-black/10 px-4 py-3 text-sm dark:border-white/15">
        <Link href="/" className="text-black/50 hover:underline dark:text-white/50">
          ← Siteye dön
        </Link>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
