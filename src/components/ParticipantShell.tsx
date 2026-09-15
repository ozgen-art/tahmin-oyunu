import Link from "next/link";
import { getCurrentParticipant } from "@/lib/participant-session";
import { logoutParticipantAction } from "@/app/actions/participant";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const NAV_ITEMS = [
  { href: "/maclar", label: "Maçlar", key: "maclar" },
  { href: "/tahminlerim", label: "Tahminlerim", key: "tahminlerim" },
  { href: "/liderlik-tablosu", label: "Liderlik", key: "liderlik" },
] as const;

export default async function ParticipantShell({
  children,
  activeNav,
}: {
  children: React.ReactNode;
  activeNav?: (typeof NAV_ITEMS)[number]["key"];
}) {
  const participant = await getCurrentParticipant();

  return (
    <div className="p-shell">
      <div className="p-phone">
        <div className="p-topbar">
          <Link href="/" className="p-brand-chip">
            <span className="p-dot" />
            UCL · UEL Tahmin
          </Link>
          <div className="flex items-center gap-2">
            <nav className="p-nav">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={item.key === activeNav ? "active" : ""}
                >
                  {item.label}
                </Link>
              ))}
              {participant ? (
                <form action={logoutParticipantAction}>
                  <button type="submit">Çıkış</button>
                </form>
              ) : (
                <Link href="/giris">Giriş</Link>
              )}
            </nav>
            {participant && <div className="p-avatar">{initialsOf(participant.displayName)}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
