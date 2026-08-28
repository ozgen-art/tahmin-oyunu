# UCL · UEL Tahmin Yarışması

Sadece **UEFA Şampiyonlar Ligi** ve **UEFA Avrupa Ligi** maçları için çalışan bir web tahmin
yarışması. Katılımcılar her maç için üç kategoride tahmin yapar:

1. **Maç Sonucu** (1 / Berabere / 2)
2. **Kesin Skor**
3. **İlk Golü Atan Oyuncu**

Her seçeneğin puanı, o seçeneğin bahis oranından türetilir:

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
service-role anahtarı, yani sunucu tarafı erişebilir). `0002_seed_matches.sql`, tablo boşsa birkaç
örnek UCL/UEL maçı ekler (gerçek takım isimleriyle ama uydurma oranlarla) — admin panelinden
silinip gerçek maçlarla değiştirilebilir.

### 3. Çalıştır

```bash
npm run dev
```

- **Katılımcılar**: `/giris` üzerinden bir isim + 4 haneli PIN ile "kayıt olur". `/maclar`
  üzerinden tahmin yapılır, `/tahminlerim` kişisel geçmişi, `/liderlik-tablosu` genel sıralamayı
  gösterir.
- **Admin**: `/admin` üzerinden `.env.local`'daki `ADMIN_PASSWORD` ile giriş yapılır. Maç ekleme,
  oran girişi (puanlar DB'de otomatik hesaplanır) ve maç sonuçlandırma buradan yapılır.

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
   - `DATABASE_URL` gerekmiyor (sadece `npm run migrate` yerelde/CI'da çalıştırılır, Vercel'de
     runtime'da kullanılmaz)
4. Deploy. Migration'ları Vercel değil, siz (yerelden `npm run migrate` ile) veya bir CI adımı
   çalıştırır — Supabase şeması Vercel deploy'undan bağımsızdır, bir kere kurulur.

Sonraki her `git push` otomatik yeni bir deploy tetikler. Yeni bir migration eklerseniz
(`supabase/migrations/000X_....sql`), deploy'dan önce/sonra yerelden `npm run migrate` ile
uygulamanız gerekir (Vercel build adımı migration çalıştırmaz).

### Canlı oran/sonuç API'si bağlamak için

`src/lib/odds-source.ts` dosyası, ileride gerçek bir maç/oran API'sine (API-Football, Odds API
vb.) bağlanmak için hazırlanmış bir arayüz (`ExternalMatch` tipi ve
`fetchUpcomingMatchesFromLiveApi()` stub'ı) içeriyor. Sadece Şampiyonlar Ligi ve Avrupa Ligi
maçlarının alındığından emin olun (competition/league id filtresi).

## Puanlama mantığı özeti

- Bir maça **başlama saatinden sonra** tahmin girilemez/değiştirilemez (kilitlenir).
- Maç `finalize` edildiğinde (admin panelinden gerçek skor + ilk gol atan girilir):
  - Maç sonucu skor'dan otomatik türetilir (DB'de generated column).
  - Her katılımcının tahmini, üç kategoride ayrı ayrı doğru/yanlış değerlendirilir; doğru olan
    her kategori, katılımcının **seçtiği seçeneğin puanını** kazanır.
  - Liderlik tablosu, tüm sonuçlanmış maçlardaki kazanılan puanların toplamıdır.

## Yapı

```
supabase/migrations/    şema + seed SQL (npm run migrate ile uygulanır)
scripts/run-migrations.ts   migration runner (DATABASE_URL gerekir)
src/
  lib/
    types.ts               veri modeli
    supabase-admin.ts       service-role Supabase client (sadece sunucu)
    db.ts                    veri erişim katmanı (Supabase sorguları)
    scoring.ts               oran → puan formülü, kazanan türetme
    parse.ts                  admin panelindeki toplu oran metinlerini ayrıştırma
    admin-auth.ts / require-admin.ts    admin şifre/oturum
    participant-session.ts                katılımcı oturumu (cookie)
    odds-source.ts                         gelecekteki canlı API entegrasyon noktası
  app/
    actions/               Server Actions (participant.ts, predictions.ts, admin.ts)
    giris/                  katılımcı giriş
    maclar/                  maç listesi + tahmin formu
    tahminlerim/              kişisel tahmin geçmişi
    liderlik-tablosu/          genel sıralama
    admin/                     admin girişi + panel (maç/oran yönetimi, sonuçlandırma)
```
