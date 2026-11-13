-- RSVP responses for the Sweekruti & Siddhanth wedding invitation.
-- Run once in Supabase (SQL Editor → paste → Run), or with `supabase db push`.

create table if not exists public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  email         text not null check (email = lower(email) and char_length(email) <= 254),
  phone         text not null check (char_length(phone) <= 20),
  attending     boolean not null,
  guest_count   integer not null default 0 check (guest_count between 0 and 20),
  events        text[] not null default '{}'
                check (events <@ array['engagement','haldi','mehendi','sangeet','muhuratham','reception']::text[]),
  dietary       text not null default 'none',
  dietary_notes text not null default '' check (char_length(dietary_notes) <= 300),
  message       text not null default '' check (char_length(message) <= 1000),
  -- One response per email address; a second submission updates the first.
  constraint rsvps_email_unique unique (email),
  constraint rsvps_declined_has_no_guests check (attending or guest_count = 0)
);

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);

-- Guest details are private. Row Level Security is on with no policies, and the
-- browser-facing roles have no privileges at all, so the table can only be
-- reached by the server using the secret (service role) key.
alter table public.rsvps enable row level security;
revoke all on table public.rsvps from anon, authenticated;
