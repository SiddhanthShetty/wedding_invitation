-- Guest list: one row per family, each with its own invitation link (…/?i=<token>).
-- Replies that come through a family's link are tied to that family.

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  token       text not null unique check (token ~ '^[A-Za-z0-9]{10,32}$'),
  family      text not null check (char_length(family) between 1 and 80),
  phone       text not null default '' check (char_length(phone) <= 20),
  max_guests  integer check (max_guests between 1 and 20)
);

-- Private like the replies: no access for browser roles, server key only.
alter table public.invites enable row level security;
revoke all on table public.invites from anon, authenticated;

alter table public.rsvps add column if not exists invite_id uuid references public.invites(id) on delete set null;
create index if not exists rsvps_invite_id_idx on public.rsvps (invite_id);
