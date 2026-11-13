-- Email becomes optional; a guest's phone number now identifies their response,
-- so replying again from the same number updates the earlier reply.
-- Safe to run on a fresh database right after 0001.

alter table public.rsvps alter column email drop not null;
alter table public.rsvps drop constraint if exists rsvps_email_unique;

-- The app stores a normalised form of the number here (e.g. "+919876543210").
alter table public.rsvps add column if not exists phone_key text;
update public.rsvps
   set phone_key = case
     when regexp_replace(phone, '[^0-9+]', '', 'g') like '+%' then '+' || regexp_replace(phone, '\D', '', 'g')
     when regexp_replace(phone, '\D', '', 'g') ~ '^00' then '+' || substr(regexp_replace(phone, '\D', '', 'g'), 3)
     when regexp_replace(phone, '\D', '', 'g') ~ '^[6-9][0-9]{9}$' then '+91' || regexp_replace(phone, '\D', '', 'g')
     else regexp_replace(phone, '\D', '', 'g')
   end
 where phone_key is null;
alter table public.rsvps alter column phone_key set not null;
alter table public.rsvps add constraint rsvps_phone_key_unique unique (phone_key);
