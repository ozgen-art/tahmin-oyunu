import Link from "next/link";
import { getCurrentParticipant } from "@/lib/participant-session";
import { logoutParticipantAction } from "@/app/actions/participant";

export default async function Header() {
  const participant = await getCurrentParticipant();

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white">
            UCL · UEL
          </span>
          <span>Tahmin Yarışması</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/maclar" className="hover:underline">
            Maçlar
          </Link>
          <Link href="/tahminlerim" className="hover:underline">
            Tahminlerim
          </Link>
          <Link href="/liderlik-tablosu" className="hover:underline">
            Liderlik Tablosu
          </Link>
          {participant ? (
            <>
              <span className="text-black/60 dark:text-white/60">
                Merhaba, <strong>{participant.displayName}</strong>
              </span>
              <form action={logoutParticipantAction}>
                <button type="submit" className="hover:underline cursor-pointer">
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/giris"
              className="rounded bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              Giriş Yap
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
