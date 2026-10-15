-- Maçtan ~10 dakika önceki ikinci hatırlatma için "gönderildi" işareti
-- (1 saatlik hatırlatma matches.reminder_sent_at ile tutuluyor).
alter table matches add column if not exists reminder10_sent_at timestamptz;
