-- Tahmin Yarışması — İlk şema
-- UEFA Şampiyonlar Ligi (UCL) ve UEFA Avrupa Ligi (UEL) maçları için
-- skor / ilk gol / kazanan tahmin oyunu.

create extension if not exists "pgcrypto"; -- gen_random_uuid() için

-- ---------------------------------------------------------------------------
-- Maçlar
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  competition text not null check (competition in ('UCL', 'UEL')),
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'finished')),
  final_home_score int check (final_home_score >= 0),
  final_away_score int check (final_away_score >= 0),
  -- skordan otomatik türetilir, elle set edilmez
  final_winner text generated always as (
    case
      when final_home_score is null or final_away_score is null then null
      when final_home_score > final_away_score then 'home'
      when final_home_score < final_away_score then 'away'
      else 'draw'
    end
  ) stored,
  final_scorer_option_id uuid, -- fk aşağıda (scorer_options'tan sonra) eklenir
  created_at timestamptz not null default now()
);

create index if not exists matches_kickoff_at_idx on matches (kickoff_at);

-- ---------------------------------------------------------------------------
-- Maç Sonucu (1 / X / 2) seçenekleri
-- ---------------------------------------------------------------------------
create table if not exists result_options (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  outcome text not null check (outcome in ('home', 'draw', 'away')),
  odds numeric(6, 2) not null check (odds > 1),
  -- puan = oran x 10, tam sayıya yuvarlanır (bkz. proje kuralı)
  points int generated always as (round(odds * 10)::int) stored,
  unique (match_id, outcome)
);

-- ---------------------------------------------------------------------------
-- Kesin Skor seçenekleri
-- ---------------------------------------------------------------------------
create table if not exists score_options (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  home_score int not null check (home_score >= 0),
  away_score int not null check (away_score >= 0),
  odds numeric(6, 2) not null check (odds > 1),
  points int generated always as (round(odds * 10)::int) stored,
  unique (match_id, home_score, away_score)
);

-- ---------------------------------------------------------------------------
-- İlk Golü Atan Oyuncu seçenekleri
-- ---------------------------------------------------------------------------
create table if not exists scorer_options (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_name text not null,
  team_side text not null check (team_side in ('home', 'away', 'none')),
  odds numeric(6, 2) not null check (odds > 1),
  points int generated always as (round(odds * 10)::int) stored,
  unique (match_id, player_name)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_final_scorer_option_id_fkey'
  ) then
    alter table matches
      add constraint matches_final_scorer_option_id_fkey
      foreign key (final_scorer_option_id) references scorer_options(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Katılımcılar (isim + PIN ile basit oturum, hesap/e-posta gerekmez)
-- ---------------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  display_name_lower text generated always as (lower(display_name)) stored,
  pin_hash text not null,
  session_token text not null unique,
  created_at timestamptz not null default now()
);

create unique index if not exists participants_display_name_lower_idx
  on participants (display_name_lower);

-- ---------------------------------------------------------------------------
-- Tahminler
-- ---------------------------------------------------------------------------
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  result_option_id uuid references result_options(id) on delete set null,
  score_option_id uuid references score_options(id) on delete set null,
  scorer_option_id uuid references scorer_options(id) on delete set null,
  result_points_earned int,
  score_points_earned int,
  scorer_points_earned int,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, match_id)
);

create index if not exists predictions_match_id_idx on predictions (match_id);
create index if not exists predictions_participant_id_idx on predictions (participant_id);

-- ---------------------------------------------------------------------------
-- RLS: her tabloda etkin, hiç policy yok. Uygulama sadece service-role
-- anahtarıyla (RLS'i bypass eder) sunucu tarafından erişiyor; anon/authenticated
-- rollerine hiçbir doğrudan erişim verilmiyor.
-- ---------------------------------------------------------------------------
alter table matches enable row level security;
alter table result_options enable row level security;
alter table score_options enable row level security;
alter table scorer_options enable row level security;
alter table participants enable row level security;
alter table predictions enable row level security;
