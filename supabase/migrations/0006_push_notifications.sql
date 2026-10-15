-- Web push bildirimleri: her katılımcının (birden fazla olabilir) cihaz
-- abonelikleri + maç başına "1 saat kala hatırlatma gönderildi" işareti.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_participant_idx
  on push_subscriptions (participant_id);

alter table push_subscriptions enable row level security;

alter table matches add column if not exists reminder_sent_at timestamptz;
