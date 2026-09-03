-- API-Football gibi canlı bir kaynaktan otomatik içe aktarılan maçları
-- tekrar tekrar eklememek (dedupe) için dış kaynak kimliği.
alter table matches add column if not exists external_ref text unique;
