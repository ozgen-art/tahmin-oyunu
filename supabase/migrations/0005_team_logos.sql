-- Yeni tahmin ekranında takım "forma"/logo göstermek için. API-Football
-- fikstür verisinde her takımın logo URL'i geliyor (teams.home.logo /
-- teams.away.logo); admin panelinden manuel eklenen maçlarda boş kalır ve
-- arayüz otomatik bir baş harf rozetine düşer.
alter table matches
  add column if not exists home_logo_url text,
  add column if not exists away_logo_url text;
