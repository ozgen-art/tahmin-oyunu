-- Bu migration dört değişikliği birlikte getirir:
--
-- 1) Skor tahmini artık serbest metin (ev/deplasman skoru, iki sayı) —
--    önceden sabit bir "kesin skor" listesinden seçiliyordu
--    (score_option_id). predictions.predicted_home_score /
--    predicted_away_score eklenir, mevcut kayıtlar score_options
--    tablosundan geriye dönük doldurulur (backfill). score_option_id
--    kolonu DROP edilmiyor (geriye dönük uyumluluk / güvenlik için), ama
--    uygulama kodu artık onu kullanmıyor.
--
-- 2) Haftada bir kez kullanılabilen "joker" (3 kat puan) — sadece
--    Galatasaray / Fenerbahçe / Beşiktaş / Trabzonspor'un oynadığı
--    maçlarda. matches.is_joker_eligible + predictions.joker_used.
--
-- 3) matches.is_joker_eligible, mevcut maçlar için takım isimlerine göre
--    geriye dönük dolduruluyor.

alter table predictions
  add column if not exists predicted_home_score int,
  add column if not exists predicted_away_score int,
  add column if not exists joker_used boolean not null default false;

update predictions p
set predicted_home_score = so.home_score,
    predicted_away_score = so.away_score
from score_options so
where p.score_option_id = so.id
  and p.predicted_home_score is null;

alter table matches
  add column if not exists is_joker_eligible boolean not null default false;

update matches
set is_joker_eligible = true
where is_joker_eligible = false
  and (
    home_team ilike '%galatasaray%' or away_team ilike '%galatasaray%' or
    home_team ilike '%fenerbah%' or away_team ilike '%fenerbah%' or
    home_team ilike '%beşiktaş%' or away_team ilike '%beşiktaş%' or
    home_team ilike '%besiktas%' or away_team ilike '%besiktas%' or
    home_team ilike '%trabzonspor%' or away_team ilike '%trabzonspor%'
  );
