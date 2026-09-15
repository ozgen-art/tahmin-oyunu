import Link from "next/link";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";

export default async function HomePage() {
  const participant = await getCurrentParticipant();

  return (
    <ParticipantShell>
      <h1 className="p-greeting">
        Maçları tahmin et, <span>puan topla</span>
      </h1>
      <p className="p-subtitle">
        UEFA Şampiyonlar Ligi &amp; UEFA Avrupa Ligi maçları için skor ve ilk gol tahmini yap —
        oranları görmeden, kör tahmin. Her hafta bir maçta jokerini kullanıp puanını 3&apos;e
        katlayabilirsin.
      </p>

      <div className="flex flex-wrap gap-3" style={{ marginBottom: 28 }}>
        {participant ? (
          <Link href="/maclar" className="p-save-btn" style={{ width: "auto", padding: "12px 22px" }}>
            Maçlara git
          </Link>
        ) : (
          <Link href="/giris" className="p-save-btn" style={{ width: "auto", padding: "12px 22px" }}>
            İsim ve PIN ile başla
          </Link>
        )}
        <Link
          href="/liderlik-tablosu"
          className="p-input"
          style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
        >
          Liderlik tablosu
        </Link>
      </div>

      <div className="p-match-list">
        <div className="p-card">
          <p className="p-scorer-label" style={{ marginBottom: 4 }}>
            Nasıl oynanır
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Her maç için elle bir skor gir ve (varsa) ilk golü kimin atacağını seç. Oranları hiç
            görmezsin — puanların maç bittikten sonra <Link href="/tahminlerim" className="underline">Tahminlerim</Link>{" "}
            sayfasında açılır.
          </p>
        </div>
        <div className="p-card">
          <p className="p-scorer-label" style={{ marginBottom: 4 }}>
            🃏 Haftalık joker
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Galatasaray, Fenerbahçe, Beşiktaş veya Trabzonspor&apos;un oynadığı bir maçta haftada
            bir kez joker kullanabilirsin — o maçtan kazandığın puan 3 katına çıkar.
          </p>
        </div>
        <div className="p-card">
          <p className="p-scorer-label" style={{ marginBottom: 4 }}>
            Kilitlenme
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Bir maça başlama saatinden sonra tahmin girilemez ya da değiştirilemez.
          </p>
        </div>
      </div>
    </ParticipantShell>
  );
}
