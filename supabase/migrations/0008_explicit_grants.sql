-- Supabase, 30 Ekim 2026'dan itibaren "public" şemasında yeni oluşturulan
-- tablolara Data API yetkisini otomatik vermiyor. Uygulama veritabanına sadece
-- service_role anahtarıyla (sunucu tarafı) eriştiği için yetkiyi açıkça yalnızca
-- ona veriyoruz; anon/authenticated'a bilerek yetki verilmiyor (RLS de açık).
-- Mevcut projede etkisi yok (yetkiler zaten var), ama şemayı sıfırdan kuran
-- yeni proje / preview branch / `supabase db reset` için gerekli.
--
-- Yeni bir tablo eklerken aynı migration'a şunu da ekle:
--   grant select, insert, update, delete on public.<tablo> to service_role;

grant select, insert, update, delete on public.participants to service_role;
grant select, insert, update, delete on public.matches to service_role;
grant select, insert, update, delete on public.result_options to service_role;
grant select, insert, update, delete on public.score_options to service_role;
grant select, insert, update, delete on public.scorer_options to service_role;
grant select, insert, update, delete on public.predictions to service_role;
grant select, insert, update, delete on public.push_subscriptions to service_role;
