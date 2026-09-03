-- NOT: Bu migration daha önce örnek/mock UCL-UEL maçları ekliyordu (arayüzü
-- göstermek için). Site canlıya alınıp gerçek kullanıcılar kayıt olduktan
-- sonra bu sahte maçlar production veritabanından silindi — gerçek
-- kullanıcılar onlara tahmin girmiş ama hiçbir zaman sonuçlanmayacaklardı.
--
-- Bilerek no-op bırakıldı: `matches` tablosu tekrar boş kalsa bile (ör. tüm
-- maçlar admin tarafından silinirse) bu dosya bir daha otomatik sahte veri
-- eklemesin diye. Yeni maçlar artık admin panelinden ("API'den Maç İçe
-- Aktar" butonu veya manuel form) ekleniyor.
select 1;
