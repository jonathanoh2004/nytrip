-- NYC Trip Planner — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Reels (individual Instagram/link items added to the board)
create table if not exists reels (
  id          text primary key,
  title       text not null,
  url         text not null,
  note        text not null default '',
  category    text not null default 'food',
  added_by    text not null,
  placed_day  text
);

-- 2. Events (scheduled activities on the calendar)
create table if not exists events (
  id         text primary key,
  title      text not null,
  note       text not null default '',
  day        text not null,
  start_time text not null,
  end_time   text not null,
  category   text not null default 'sight',
  added_by   text not null,
  from_reel  text
);

-- 3. Single settings row (trip dates, user roster, reel display order)
create table if not exists settings (
  id         int primary key default 1,
  trip_start text not null default '2026-05-10',
  trip_end   text not null default '2026-05-23',
  roster     jsonb not null default '[]',
  reel_order jsonb not null default '[]',
  constraint only_one_row check (id = 1)
);

-- Seed the settings row (safe to run multiple times)
insert into settings (id) values (1)
  on conflict (id) do nothing;

-- Enable real-time for all three tables (needed for live updates between friends)
-- Go to Database → Replication in Supabase dashboard and enable these tables,
-- OR run these if you have access:
-- alter publication supabase_realtime add table reels;
-- alter publication supabase_realtime add table events;
-- alter publication supabase_realtime add table settings;

-- Add cost column (run if upgrading from the initial schema)
alter table reels  add column if not exists cost numeric default 0;
alter table events add column if not exists cost numeric default 0;

-- Disable Row Level Security so the anon key has full access
-- (Fine for a private friend group app — do NOT use on a public app)
alter table reels    disable row level security;
alter table events   disable row level security;
alter table settings disable row level security;
