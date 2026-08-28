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

Örnek: oran `1.30` → `13` puan, oran `10.00` → `100` puan. Yani riskli/düşük ihtimalli bir
tahmin daha çok puan getirir — tıpkı bahis oranlarında olduğu gibi.

## Bu proje JCI Bursa networking uygulamasından bağımsızdır

Bu, `JCI Bursa` klasöründeki eşleştirme uygulamasından tamamen ayrı, kendi başına bir Next.js
projesidir (`/Users/mac/Downloads/tahmin-yarismasi`). İkisi arasında kod/veri paylaşımı yoktur.

## Çalıştırma

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD değerini değiştirin
npm run dev
```

Uygulama `http://localhost:3000` üzerinde açılır.

- **Katılımcılar**: `/giris` üzerinden bir isim + 4 haneli PIN ile "kayıt olur" (şifre değildir,
  sadece aynı isimle geri dönebilmek için). `/maclar` üzerinden tahmin yapılır, `/tahminlerim`
  kişisel geçmişi, `/liderlik-tablosu` genel sıralamayı gösterir.
- **Admin**: `/admin` üzerinden `.env.local`'daki `ADMIN_PASSWORD` ile giriş yapılır. Admin
  panelinden maç eklenir, üç kategori için oranlar girilir (puanlar oranlardan otomatik
  hesaplanır) ve maç bittiğinde gerçek skor + ilk golü atan girilerek tüm tahminlerin puanı tek
  seferde hesaplanır.

## Veri ve durum

Şu an gerçek bir canlı maç/oran API'si **bağlı değil**. Sistem iki şekilde veri alır:

1. **Admin panelinden manuel giriş** (asıl kullanım yolu) — maçlar, oranlar ve nihai sonuçlar
   admin panelinden elle girilir.
2. **Örnek (mock) başlangıç verisi** — `src/lib/db.ts` içindeki `seedIfEmpty()` fonksiyonu, veri
   deposu boşken birkaç örnek UCL/UEL maçını (gerçek takım isimleriyle ama uydurma oranlarla)
   otomatik olarak oluşturur; sadece arayüzün nasıl çalıştığını göstermek içindir, admin
   panelinden silinip gerçek maçlarla değiştirilebilir.

Kalıcılık, native bağımlılık gerektirmeyen basit bir **JSON dosyası** (`data/db.json`, ilk
çalıştırmada otomatik oluşur) ile sağlanıyor — küçük ölçekli bir yarışma için yeterli. İleride
gerçek bir veritabanına geçmek istenirse tek değişmesi gereken yer `src/lib/store.ts` (ve/veya
`src/lib/db.ts` içindeki fonksiyonların implementasyonu).

### Canlı oran/sonuç API'si bağlamak için

`src/lib/odds-source.ts` dosyası, ileride gerçek bir maç/oran API'sine (API-Football, Odds API
vb.) bağlanmak için hazırlanmış bir arayüz (`ExternalMatch` tipi ve
`fetchUpcomingMatchesFromLiveApi()` stub'ı) içeriyor. API entegrasyonu kurulduğunda bu dosya
implemente edilip admin panelindeki maç oluşturma akışına bağlanabilir. Sadece Şampiyonlar Ligi
ve Avrupa Ligi maçlarının alındığından emin olun (competition/league id filtresi).

## Puanlama mantığı özeti

- Bir maça **başlama saatinden sonra** tahmin girilemez/değiştirilemez (kilitlenir).
- Maç `finalize` edildiğinde (admin panelinden gerçek skor + ilk gol atan girilir):
  - Maç sonucu skor'dan otomatik türetilir (ev skoru > deplasman skoru → ev kazanır, vb.).
  - Her katılımcının o maça ait tahmini, üç kategoride ayrı ayrı doğru/yanlış olarak
    değerlendirilir; doğru olan her kategori, katılımcının **seçtiği seçeneğin puanını** kazanır.
  - Liderlik tablosu, tüm sonuçlanmış maçlardaki kazanılan puanların toplamıdır.

## Yapı

```
src/
  lib/
    types.ts            veri modeli
    store.ts             JSON dosya deposu (native bağımlılık yok)
    db.ts                 veri erişim katmanı + örnek veri seed'i
    scoring.ts            oran → puan formülü, kazanan türetme
    parse.ts               admin panelindeki toplu oran metinlerini ayrıştırma
    admin-auth.ts / require-admin.ts    admin şifre/oturum
    participant-session.ts               katılımcı oturumu (cookie)
    odds-source.ts                        gelecekteki canlı API entegrasyon noktası
  app/
    actions/               Server Actions (participant.ts, predictions.ts, admin.ts)
    giris/                  katılımcı giriş
    maclar/                  maç listesi + tahmin formu
    tahminlerim/              kişisel tahmin geçmişi
    liderlik-tablosu/          genel sıralama
    admin/                     admin girişi + panel (maç/oran yönetimi, sonuçlandırma)
```
