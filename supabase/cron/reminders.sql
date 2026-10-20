-- Maç hatırlatma bildirimlerini tetikleyen zamanlayıcı (Supabase pg_cron + pg_net).
-- migration DEĞİL: CRON_SECRET içerdiği için elle, bir kez çalıştırılır
-- (SQL Editor'de ya da DATABASE_URL ile). <CRON_SECRET> yerine Vercel'deki
-- CRON_SECRET değerini yaz. Her 2 dakikada siteyi çağırır.
--
-- GitHub Actions'ın "*/5" zamanlayıcısı güvenilir değil (saatlerce atlayabiliyor),
-- bu yüzden asıl tetikleyici bu.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'mac-hatirlatma',
  '*/2 * * * *',
  $$select net.http_get(
      url := 'https://tahmin-oyunu-three.vercel.app/api/cron/reminders',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
      timeout_milliseconds := 20000
  )$$
);

-- Durum kontrolü:   select * from cron.job_run_details order by start_time desc limit 5;
--                   select status_code, content from net._http_response order by created desc limit 5;
-- Durdurmak için:   select cron.unschedule('mac-hatirlatma');
