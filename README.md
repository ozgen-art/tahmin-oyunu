# UCL · UEL Tahmin Yarışması

Sadece **UEFA Şampiyonlar Ligi** ve **UEFA Avrupa Ligi** maçları için çalışan bir web tahmin
yarışması. "Premium Tahmin" temalı (koyu/altın renkli, Sora+Inter fontlu) katılımcı arayüzü,
`/maclar`'da haftalık maçları **tek tek, sırayla** tahmin ettiren bir sihirbaz (bkz.
`src/app/maclar/PredictionWizard.tsx`) şeklinde çalışır — admin paneli ise kasıtlı olarak sade/nötr
bırakıldı (`src/app/admin/layout.tsx`).

Katılımcılar her maç için tek bir şey tahmin eder:

- **Kesin Skor** — elle girilir (ör. "3-2"); **Maç Sonucu (1/Berabere/2) girilen skordan otomatik
  türetilir**, ayrıca sorulmaz.

> **Not:** "İlk Golü Atan Oyuncu" kategorisi **şimdilik kaldırıldı** (UEFA'nın kadro sayfası
> güvenilir isim vermediği için) — DB şeması (`scorer_options`, `predictions.scorer_option_id`,
> `matches.final_scorer_option_id`) duruyor, sadece UI'dan (`PredictionWizard.tsx`, admin
> `FinalizeForm`/`ScorerOddsForm`) çıkarıldı. Geri getirmek istenirse bu dosyalara bakın.

**Oranlar ve puanlar katılımcıya hiç gösterilmez.** Tahminler kör olarak girilir; puan
hesaplaması tamamen arka planda yapılır (bkz. [Puanlama mantığı özeti](#puanlama-mantığı-özeti)).
Admin panelinde ise oranlar görünür durumda kalır.

Temel puan formülü, o seçeneğin (veya çekilen tüm bahisçilerin ortalamasının) oranından
türetilir:

```
puan = round(oran × 10)
```

Örnek: oran `1.30` → `13` puan, oran `10.00` → `100` puan.

## Bu proje JCI Bursa networking uygulamasından bağımsızdır

Bu, `JCI Bursa` klasöründeki eşleştirme uygulamasından tamamen ayrı, kendi başına bir Next.js
projesidir. İkisi arasında kod/veri paylaşımı yoktur (Supabase projeleri de dahil — ayrı bir
Supabase projesi kullanır).

## Veritabanı: Supabase

Kalıcılık Postgres (Supabase) ile sağlanır — Vercel'in serverless fonksiyonlarında dosya sistemi
kalıcı olmadığı için yerel dosya tabanlı bir depo prodüksiyonda çalışmaz.

### 1. Supabase projesi oluştur

[supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur (JCI Bursa'nın Supabase
projesinden **ayrı**, yeni bir proje). Sonra **Project Settings → API** sayfasından:

- `Project URL` → `.env.local`'da `NEXT_PUBLIC_SUPABASE_URL`
- `service_role` anahtarı (gizli!) → `.env.local`'da `SUPABASE_SERVICE_ROLE_KEY`

**Project Settings → Database → Connection string → URI**'den de bağlantı stringini alıp
`.env.local`'da `DATABASE_URL` olarak ekle (şifreyi kendin gireceksin, proje oluştururken
belirlediğin veritabanı şifresi).

### 2. Şemayı kur

```bash
cp .env.example .env.local   # değerleri doldur
npm install
npm run migrate               # supabase/migrations/*.sql dosyalarını sırayla çalıştırır
```

`supabase/migrations/0001_init.sql` şemayı kurar (RLS her tabloda açık, hiç policy yok — sadece
service-role anahtarı, yani sunucu tarafı erişebilir). `0002_seed_matches.sql` artık no-op —
başlangıçta arayüzü göstermek için örnek/mock maç ekliyordu, ama site canlıya alınıp gerçek
kullanıcılar kayıt olduktan sonra bu sahte maçlar kaldırıldı (asla sonuçlanmayacaklardı). Yeni
maçlar admin panelinden ekleniyor — bkz. aşağıdaki "Canlı oran/sonuç API'si" bölümü.
`0003_add_external_ref.sql`, API'den içe aktarılan maçları tekrar eklememek için bir dedupe
sütunu ekler.

### 3. Çalıştır

```bash
npm run dev
```

- **Katılımcılar**: `/giris` üzerinden bir isim + 4 haneli PIN ile "kayıt olur". `/maclar`
  üzerinden tahmin yapılır, `/tahminlerim` kişisel geçmişi, `/liderlik-tablosu` genel sıralamayı
  gösterir.
- **Admin**: `/admin` üzerinden `.env.local`'daki `ADMIN_PASSWORD` ile giriş yapılır. Maç ekleme,
  oran girişi (puanlar DB'de otomatik hesaplanır) ve maç sonuçlandırma buradan yapılır. "Tahmin
  Hatırlatma" bölümü, hâlâ tahmine açık maçlardan hangi katılımcının hangilerine tahmin girmediğini
  (en eksik olan en üstte) listeler — kime hatırlatma yapılacağını bulmak için (bkz.
  `getPendingPredictions` in `src/lib/db.ts`).

## Vercel'e deploy

1. **GitHub'a push et** (proje deposu yoksa github.com'da boş bir repo oluşturup uzak adresi
   ekle):
   ```bash
   git remote add origin https://github.com/<kullanıcı-adı>/<repo-adı>.git
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub reposunu seç → Import.
3. **Environment Variables** ekranında (Production + Preview + Development hepsine) şunları gir:
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `API_FOOTBALL_KEY` (admin panelindeki "API'den Maç İçe Aktar" butonu için)
   - `DATABASE_URL` gerekmiyor (sadece `npm run migrate` yerelde/CI'da çalıştırılır, Vercel'de
     runtime'da kullanılmaz)
4. Deploy. Migration'ları Vercel değil, siz (yerelden `npm run migrate` ile) veya bir CI adımı
   çalıştırır — Supabase şeması Vercel deploy'undan bağımsızdır, bir kere kurulur.

Sonraki her `git push` otomatik yeni bir deploy tetikler. Yeni bir migration eklerseniz
(`supabase/migrations/000X_....sql`), deploy'dan önce/sonra yerelden `npm run migrate` ile
uygulamanız gerekir (Vercel build adımı migration çalıştırmaz).

### Canlı oran/sonuç API'si: API-Football

`src/lib/odds-source.ts`, [api-football.com](https://www.api-football.com) (api-sports.io) ile
entegre — admin panelindeki **"Bugün/Yarının UCL-UEL Maçlarını API'den Çek"** butonu bu dosyadaki
`fetchUpcomingMatchesFromLiveApi()`'yi çağırır: league id `2` (UCL) ve `3` (UEL) için maç sonucu,
kesin skor ve ilk gol atan oranlarını çeker, yeni maçları oluşturur / henüz kilitlenmemiş
maçların oranlarını günceller (`external_ref` ile dedupe edilir).

**Önemli kısıt:** ücretsiz API-Football planı hem `/fixtures` hem `/odds` uç noktalarında sadece
**dün/bugün/yarın** penceresine izin veriyor (her gün kayar) — daha ileri bir tarih istenirse API
hata döner. Bu yüzden bir maçı yakalamak için butona **her gün** basmak gerekiyor; ileri tarihli
bir maç takvimi/fikstür listesi gösteremiyoruz. Üst plana (Pro/Ultra/Mega, $19/ay+) geçilirse bu
kısıt kalkar ve daha geniş bir tarih aralığı sorgulanabilir — `odds-source.ts`'te değişiklik
gerekmez.

**Bilinen sorun (Eylül 2026):** API-Football hesabı, Vercel'in paylaşımlı/dinamik outbound
IP'si API-Football'un kötüye kullanım (anti-abuse) sistemini tetiklediği için **askıya
alındı**. Düzelene kadar maçlar/oranlar UEFA.com'un resmi fikstür + kadro sayfalarından elle
(admin panelinden manuel giriş ile) ekleniyor, oranlar da tahmini olarak belirleniyor. Kalıcı
çözüm için sabit/dedicated bir outbound IP gerekiyor (proxy servisi ya da ayrı bir VPS'ten
çalıştırma) — bkz. proje geçmişi/konuşma notları.

## Puanlama mantığı özeti

- Bir maça **başlama saatinden sonra** tahmin girilemez/değiştirilemez (kilitlenir).
- **Oranlar/puanlar katılımcıya hiç gösterilmez** — tahminler kör girilir, puan sadece maç
  bittikten sonra (`/tahminlerim`, maç sayfası, liderlik tablosu) görünür.
- **Maç Sonucu**: doğru tahmin, seçilen seçeneğin (tüm bahisçilerin ortalaması alınmış — bkz.
  `odds-source.ts`) puanını kazandırır.
- **Kesin Skor** (`src/lib/scoring.ts` → `computeScorePoints`), dört kademeli:
  - **Tam tuttu**: bilinen skorsa gerçek oranın puanı; bilinmiyorsa (ör. 5-0 gibi ekstrem bir
    skor) bilinen skorlardan kalibre edilmiş bir Poisson modeliyle **"optimum" bir oran**
    tahmin edilir (`estimateScorePoints`) ve puan ona göre hesaplanır.
  - **Fark tuttu** (skor değil ama gol farkı/marj aynı — ör. 1-0 dedin, 2-1 bitti): tam puanın
    **1/5**'i.
  - **Kısmi** (ne skor ne fark ama ev veya deplasman skorundan biri birebir doğru — ör. 3-1
    dedin, 5-1 bitti): tam puanın **1/10**'u.
  - Hiçbiri tutmadıysa 0.
- **Joker** (`src/lib/joker.ts`): sadece **Galatasaray / Fenerbahçe / Beşiktaş / Trabzonspor**
  maçlarında (`matches.is_joker_eligible`, takım isminden otomatik tespit edilir), katılımcı
  başına **haftada bir maçta** kullanılabilir (ISO hafta, ilgili maçın kickoff'una göre). Joker
  kullanılan tahminin kazandığı toplam puan **3 katına** çıkar.
  Liderlik tablosu, tüm sonuçlanmış maçlardaki kazanılan puanların (joker dahil) toplamıdır.

## Yapı

```
supabase/migrations/    şema + seed SQL (npm run migrate ile uygulanır)
scripts/run-migrations.ts   migration runner (DATABASE_URL gerekir)
src/
  lib/
    types.ts               veri modeli
    supabase-admin.ts       service-role Supabase client (sadece sunucu)
    db.ts                    veri erişim katmanı (Supabase sorguları)
    scoring.ts               oran → puan formülü, skor puanlama kademeleri, Poisson tahmini
    joker.ts                  haftalık joker (GS/FB/BJK/TS tespiti, ISO hafta, x3 çarpan)
    parse.ts                  admin panelindeki toplu oran metinlerini ayrıştırma
    admin-auth.ts / require-admin.ts    admin şifre/oturum
    participant-session.ts                katılımcı oturumu (cookie)
    odds-source.ts                         API-Football entegrasyonu (fikstür + oran + sonuç + logo)
    team-visuals.ts                         logo yoksa baş harf rozeti + deterministik gradyan
  components/
    ParticipantShell.tsx    katılımcı sayfalarının ortak koyu tema kabuğu (topbar + nav + avatar)
  app/
    globals.css              Tailwind + "Premium Tahmin" tema değişkenleri/sınıfları (.p-*)
    actions/               Server Actions (participant.ts, predictions.ts, admin.ts)
    giris/                  katılımcı giriş
    maclar/                  PredictionWizard.tsx — haftanın maçlarını sırayla tahmin ettiren
                              sihirbaz ("Maçlar"/"Sonuçlar" sekmeleri, ilerleme çubuğu)
    tahminlerim/              kişisel tahmin geçmişi
    liderlik-tablosu/          genel sıralama
    admin/                     admin girişi + panel — kendi layout.tsx'i ile sade/nötr tema
                                (maç/oran yönetimi, sonuçlandırma)
```
