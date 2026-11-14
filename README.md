# Sweekruti & Siddhanth — wedding invitation

A mobile-first wedding invitation website styled on the couple's emblem (gold temple arch, jasmine,
maroon silk, coastal Mangalorean sketch):
an opening cover with temple doors and a petal shower, a formal invitation from the families, the six
events (each with its venue and directions), "Good to know" notes, background Carnatic music, RSVP,
a private admin page with the guest list and a personal link for each family, a countdown, and a
QR code with print layouts.

Nothing about the wedding is invented. Parents' names, dates, times, venues and contacts are
placeholders until you fill them in.

## Contents

1. [Run it on your computer](#1-run-it-on-your-computer)
2. [Fill in the wedding details](#2-fill-in-the-wedding-details)
3. [Set up RSVP storage (Supabase)](#3-set-up-rsvp-storage-supabase)
4. [Set up the admin page](#4-set-up-the-admin-page)
5. [Going live (Vercel or Netlify)](#5-going-live)
6. [QR code and printing](#6-qr-code-and-printing)
7. [Music](#7-music)
8. [Testing](#8-testing)
9. [How it is built](#9-how-it-is-built)
10. [Security and privacy notes](#10-security-and-privacy-notes)

## 1. Run it on your computer

Needs Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local     # then edit .env.local (see below)
npm run dev                    # http://localhost:3000
```

For a quick local try-out without Supabase, put this in `.env.local`:

```
RSVP_STORAGE=file
ADMIN_PASSWORD=choose-a-long-passphrase
SESSION_SECRET=<output of: openssl rand -base64 48>
```

RSVPs are then written to `.data/rsvps.json` (git-ignored). This file store only works in
development; a deployed site must use Supabase.

Production build:

```bash
npm run build
npm start
```

## 2. Fill in the wedding details

Everything lives in **`src/config/wedding.ts`**. Replace `null` with real values as they are confirmed.

| What | Field | Format |
| --- | --- | --- |
| Parents' names for the formal invitation | `families.brideParents`, `families.groomParents` | exactly as they should read, e.g. `"Shri Ramesh Shetty and Smt. Sudha Shetty"` |
| Full names in that invitation | `families.brideFullName`, `groomFullName` | text or `null` |
| Grandparents, under the parents (G/D/o, G/S/o) | `families.brideGrandparents`, `groomGrandparents` | a list, one pair per line, e.g. `["Shri Vasu Shetty and Smt. Gulabi Shetty"]`, or `null` |
| Notes for guests ("Good to know") | `goodToKnow.weather`, `dressCode`, `hashtag`, `parking`, `driversAndStaff` | text or `null`; each appears once filled in |
| Wedding day (drives the countdown) | `weddingDate`, `weddingTime` | `"2027-02-14"`, `"10:30"` (24-hour, India time) |
| Each event | `events[n].date`, `startTime`, `endTime` | same formats; the day of the week is worked out for you |
| Each venue | `events[n].venue` | `{ name: "…", address: "…", mapsUrl: null }` |
| Dress code, description | `events[n].dressCode`, `description` | text or `null` |
| Contact in the footer | `contact` | name / phone / email or `null` |
| RSVP limits | `rsvp.maxGuestsPerInvite`, `rsvp.respondBy` | number, date or `null` |
| Background music | `music` | see [Music](#7-music) |

Notes:

- **Directions.** Once an event has a venue name and address, its card shows a "Get directions"
  button that opens Google Maps with that destination. To point at an exact pin, paste a Google Maps
  share link into that venue's `mapsUrl`. Events at different venues each get their own directions.
- **Countdown.** Runs to `weddingDate` at `weddingTime` in `timezone` (Asia/Kolkata). If
  `weddingTime` is `null` it uses the Muhuratham start time, then midnight. While `weddingDate` is
  `null` the site shows "The celebrations are coming soon".
- The six events must stay in their order. The file is validated at build time; a mistake stops the
  build with a message naming the field.
- **Families section.** Under each name come the parents (D/o, S/o), then the grandparents (G/D/o,
  G/S/o); screen readers hear "Daughter of", "Granddaughter of" and so on. Names are used exactly as
  written in the config, titles included (Shri, Smt.). Each grandparent pair gets its own G/D/o or
  G/S/o. Write "Lt." for someone who has passed away; screen readers say "Late". With no parents'
  names filled in, the card names just the couple.
- **Grandparents and "Good to know".** Anything left as `null` is hidden from guests. On your own
  computer (`npm run dev`) a faint note shows where it will go, so you don't forget it.
- **Opening cover.** The first time someone opens the invitation, they see two silk doors with
  "Open with music" and "Open quietly". The doors part onto the page and petals fall. It shows once
  per visit, and is skipped for links to a section (e.g. `…/#rsvp`), for visitors without
  JavaScript, and (without the petals) for phones set to reduce motion. Wording is in
  `src/components/Cover.tsx`.
- Wording for the hero, story and footer is in `src/components/Hero.tsx`, `Story.tsx` and `Footer.tsx`.

## 3. Set up RSVP storage (Supabase)

1. Create a project at <https://supabase.com> (the free tier is enough).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_create_rsvps.sql`, and run it.
   (With the Supabase CLI: `supabase link` then `supabase db push`.)
3. In **Project Settings → API**, copy the **Project URL** and the **secret key**
   (`service_role` / `sb_secret_…`).
4. Set them as environment variables:

   ```
   SUPABASE_URL=https://xxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=…
   ```

Then run `0002_rsvps_match_by_phone.sql` and `0003_invites.sql`, in that order, the same way.

The table has Row Level Security switched on with no policies, and the public roles have no
privileges, so guest data can only be read with the secret key, which stays on the server.
One response is kept per phone number (email is optional); replying again from the same number
updates it. Numbers are matched however they are typed: `98765 43210`, `+91 98765 43210` and
`0091-98765-43210` count as the same guest.

If storage is not configured, the RSVP form tells the guest it could not be saved. It never shows a
success message for something that was not stored.

## 4. Set up the admin page

Set two more environment variables:

```
ADMIN_PASSWORD=<a passphrase of at least 12 characters on the live site>
SESSION_SECRET=<at least 32 random characters, e.g. openssl rand -base64 48>
```

Then open **`/admin`** and sign in. You get attendance counts, the guest list, guests per event, every
response, and a **Download CSV** button.

### Guest list and personal links

Each family can have its own link (`https://…/?i=<code>`). It opens the invitation with
"Dear Rao family," on the cover and the page, shows "Replying for Rao family" on the RSVP form, and
ties their reply to their name. A family member replying again, from any phone, updates the same reply.

1. In **Add families**, type one family per line: the name they'll be greeted by, then optionally a
   phone number and the most guests they may bring, separated by commas:
   ```
   Rao family, +91 98765 43210, 4
   Asha Aunty & Uncle
   ```
   If a line has a mistake, nothing is added and the box keeps your text, so you can fix it.
2. Press **Invite** to open WhatsApp with a ready-written message and their link (straight to their
   chat if you gave a number), or **Copy link** to send it another way.
3. The list shows who has replied. Families who haven't are listed first, with a **Remind** button.

The links use `NEXT_PUBLIC_SITE_URL`. Until that's set they point to your own computer and only work
for you, so send them once the site is live. The codes are random and can't be guessed; the page only
ever learns the family's name and guest limit from one. Removing a family keeps their reply. The session lasts 8 hours. Until both variables are set, `/admin` stays
switched off.

## 5. Going live

### Vercel

1. Push this folder to a GitHub repository and import it at <https://vercel.com/new>
   (or run `npx vercel` in this folder).
2. Under **Settings → Environment Variables**, add for Production:
   `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
3. Optional: add your own domain under **Settings → Domains**.
4. Set `NEXT_PUBLIC_SITE_URL` to the final address guests will use, for example
   `https://sweekruti-siddhanth.com` or `https://your-project.vercel.app`, then **redeploy**.
   The QR code, link previews and share buttons are built from this value at build time.

### Netlify

Import the repository; Netlify detects Next.js. Add the same environment variables under
**Site configuration → Environment variables**, then redeploy.

### After deploying, check

- [ ] NirvanaSutra Music has agreed to their track being used (see [Music](#7-music)), or the site is
      switched back to the original Hamsadhwani piece.
- [ ] The site opens on `https://…` on a phone.
- [ ] Send a test RSVP; it appears on `/admin`; delete the test row in Supabase afterwards.
- [ ] The "Share the Invitation" section shows a QR code; scan it with an iPhone and an Android phone.
- [ ] Paste the link into WhatsApp; the preview shows the emblem. (WhatsApp caches previews;
      if you change the image later, test with `?v=2` on the end.)

Search engines are told not to index the site unless you set `NEXT_PUBLIC_ALLOW_INDEXING=true`.

## 6. QR code and printing

The QR code encodes `NEXT_PUBLIC_SITE_URL` and nothing else. The site refuses to produce one for
`localhost`, `file://`, plain `http://`, private addresses, or Vercel/Netlify preview addresses,
so a temporary link cannot end up on printed cards. Until the address is set, the share section
says the code is not available yet.

In the "Share the Invitation" section you can:

- download the code as PNG (1200 px) or SVG (for your card designer),
- open **Print QR code** (`/print/qr`, a small A6 card) or **Print invitation card** (`/print/card`, A5),
- copy the link, or share by WhatsApp or email.

The emblem sits above the code, never on top of it, and the code keeps its white margin.
`npm test` decodes the generated image and checks it reads back as the exact address. Still, always
print one copy and scan it before a full print run, and re-download the code if the address changes.

## 7. Music

There is one background track. It plays only when a guest chooses **Open with music** on the cover,
or presses the play button in the top bar, and it loops until they pause it.

The default is **"A Sacred Carnatic Wedding Melody" by NirvanaSutra Music**
(`public/audio/wedding-music.mp3`), credited in the footer.

> **Before going live:** NirvanaSutra Music marks this track "All rights reserved", and permission
> to use it on the invitation hasn't been confirmed yet. Get their OK first. A public site with an
> unlicensed recording can receive a takedown or copyright claim. If they say no, switch back to
> the original piece made for this site by setting `music` in `src/config/wedding.ts` to
> `{ title: "Mangala Arambha (Raga Hamsadhwani, veena)", src: "/audio/hamsadhwani.mp3", credit: null }`.

The fallback, `public/audio/hamsadhwani.mp3`, is an original piece generated by
`scripts/generate-music.py`: a tanpura drone with a line in Raga Hamsadhwani on a synthesised veena.
It's computer-made, so there is nothing to license. `npm run music` regenerates it (needs Python 3,
numpy and ffmpeg).

To use any other recording: put the file in `public/audio` (MP3 is the safest format for phones),
then set `music.src`, `title` and `credit` in `src/config/wedding.ts`. On iPhones the music volume
follows the hardware buttons.

## 8. Testing

```bash
npm run typecheck
npm test          # 77 unit tests
npm run build
```

The tests cover: the six events and their order, config validation, the families wording and
grandparents, "Good to know", the guest list (link codes, the paste-in format, one reply per family), India-time countdown maths,
directions links, RSVP validation, phone-number matching, persistence and de-duplication, admin statistics, CSV export
(including formula-injection defusing), session tokens, the production-URL rules, and decoding the
generated QR code.

Manual checks worth doing after any change:

| Check | How |
| --- | --- |
| Layout at 360, 390, 430, 768, 1024, 1440 px | Browser dev tools → device toolbar; no sideways scrolling |
| Music does not autoplay | Load the page; nothing plays until you press the play button in the top bar |
| RSVP validation | Submit empty; errors appear and focus moves to the first one |
| RSVP is stored | Submit, then look at `/admin` |
| Family links | Add a family in `/admin`, open its link: the cover and page greet them by name, and their reply appears against them |
| Duplicate protection | Submit twice with the same phone number (typed differently is fine); one row, updated |
| Admin is private | Open `/admin/export` in a private window; you get "Not signed in" |
| Opening cover | Open the site in a private window: doors and petals; "Open with music" starts the music |
| Keyboard | On the cover, Tab moves between its two buttons and Esc opens quietly; then tab through the navigation, music button and form |
| Reduced motion | Turn on "Reduce motion" in the OS; entrance and flame animations stop |

## 9. How it is built

- **Next.js 16** (App Router, React 19, TypeScript), **Tailwind CSS 4**, **Motion** (Framer Motion)
  for the menu, lightbox and form transitions, **Lucide** icons.
- **Supabase (Postgres)** for RSVPs, reached only from the server (`src/lib/storage`).
- **zod** validates both the config file and RSVP submissions (same schema in the browser and on the server).
- **qrcode** generates the QR at build time.
- The couple's emblem is `public/brand/emblem.png`; the round SS seal (`public/brand/seal.webp`),
  favicon (`src/app/icon.png`), home-screen icon (`src/app/apple-icon.png`) and link-preview image
  (`src/app/opengraph-image.png`, `twitter-image.png`) are cut from it. The page colour, #F5E5D1, is
  the emblem's own background, so the emblem blends in without visible edges. The colour palette in
  `src/app/globals.css` is taken from the emblem too.
- The other illustrations (tiled-roof house, coastal temple, palms, sea, lamps, event artwork) are
  hand-written SVG in `src/components/art.tsx`.
  Fonts (Cormorant Garamond, Marcellus; SIL Open Font License) are self-hosted from `src/fonts`.

```
src/
  config/wedding.ts        ← the one file to edit
  app/
    page.tsx               the invitation (all sections)
    layout.tsx             fonts, SEO and social metadata
    api/rsvp/route.ts      RSVP endpoint
    admin/                 sign-in, dashboard, CSV export
    print/card, print/qr   printable layouts
    opengraph-image.png    link-preview image (WhatsApp, X, etc.)
    icon.png, apple-icon.png   favicon and home-screen icon
  components/              Cover, Hero, Story, Families, Events, GoodToKnow, Rsvp, Countdown, Share, Footer, art
  lib/                     dates, maps links, QR, validation, storage, sessions, CSV
supabase/migrations/       database schema
public/brand/              the emblem and the SS seal
scripts/                   music generator
tests/                     unit tests
```

## 10. Security and privacy notes

- No secrets are in the code. Server secrets are read from environment variables and never sent to
  the browser; only `NEXT_PUBLIC_*` values are public.
- RSVP input is validated on the server, limited in size, and rate-limited per IP address
  (6 submissions per 10 minutes). A hidden honeypot field catches simple bots. The limiter is
  in-memory, so on serverless hosting it is per instance; if you ever see spam, add Vercel's
  firewall rate-limit rule or a CAPTCHA.
- Anyone who knows a guest's phone number could overwrite that guest's response by submitting again.
  That is the trade-off for letting guests correct their own reply without an account.
- The admin cookie is HTTP-only, `SameSite=Strict`, `Secure` in production, signed with
  `SESSION_SECRET`, and limited to `/admin`. Sign-in attempts are limited to 5 per 15 minutes.
  Changing `SESSION_SECRET` signs everyone out.
- `/admin` and `/api` responses are sent with `Cache-Control: no-store`.
- Guest data is personal data. Share the admin passphrase only with people who need it, and delete
  the Supabase project (or the table) once the wedding is over.
