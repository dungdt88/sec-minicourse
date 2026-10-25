# Tiệm Vòng Tay Rừng Xanh

A small Vietnamese web app for the School Enterprise Challenge mini course: four 8-year-olds play
7 levels (story cards → quiz → "Đến lượt đội con" form) on a parent's phone, and the mentor reads,
compares and exports their answers. Requirements: [`game-requirements.md`](game-requirements.md).

- **Player app**: `/`. Children pick their picture and enter a 4-digit PIN once per device.
- **Mentor console**: `/mentor`.
- **Content**: everything children see comes from [`content/course-content.json`](content/course-content.json),
  validated by [`schema/course-content.schema.json`](schema/course-content.schema.json).

The app never generates, suggests or autocompletes answers, and has no AI, trackers or analytics.

## Quick start (no server)

```sh
pnpm install
pnpm dev:local          # http://localhost:5173, data kept in this browser only
```

Demo profiles An / Bình / Chi / Dũng have PINs 1111 / 2222 / 3333 / 4444. Mentor console:
`mentor@local` / `mentor`. Use this mode for design reviews and trying content; it is **not** for
real children's data (anyone with the device can read it).

## Develop against Supabase (local)

Needs Docker running.

```sh
npx supabase start        # Postgres, Auth and the API in Docker; applies supabase/migrations
pnpm bootstrap:local      # mentor mentor@local.test / mentor-local-pass, content, 4 profiles
pnpm dev                  # uses .env.development (local Supabase URL and publishable key)
```

`npx supabase db reset` wipes the local database; run `pnpm bootstrap:local` again afterwards.
Studio (table browser) is at http://127.0.0.1:54323.

## Tests

```sh
pnpm test        # unit: content validation, all form input types, shuffle, progress, offline queue, compare
pnpm test:e2e    # Playwright: the RFP acceptance tests against local Supabase (resets the local DB)
pnpm typecheck
pnpm validate-content [path/to/file.json]
```

CI (`.github/workflows/ci.yml`) runs content validation, typecheck, unit tests and the build on
every push. The e2e suite needs Docker and the Supabase CLI, so run it by hand before a release.

`pnpm test:e2e` **resets the database it runs against**. To keep your dev data, run it on a
second local stack (copy `supabase/` to another folder, change `project_id` and the ports in its
`config.toml`, `npx supabase start --workdir <folder>`), then:

```sh
E2E_SUPABASE_WORKDIR=<folder> E2E_SUPABASE_URL=http://127.0.0.1:<api port> E2E_APP_PORT=5175 pnpm test:e2e
```

`e2e/acceptance.spec.ts` automates acceptance tests 1–13 and 15 from section 12. Test 14 (first
screen under 3 s on a 4-year-old Android over 4G) needs a real device.

## Deploy (client's own accounts)

Expected cost at this scale: **USD 0/month** (Supabase free tier + Vercel Hobby). A free Supabase
project pauses after a week without traffic; open the app or the dashboard to wake it, or move to
Supabase Pro (USD 25/month) if that becomes a problem during the course.

1. **Supabase**: create a project (region Singapore is closest to Ho Chi Minh City).
   - Link and push the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
   - Authentication → Sign In / Providers: turn **off** "Allow new users to sign up". Keep Email on.
   - Authentication → URL Configuration: Site URL = your Vercel URL; add `https://<your-app>/mentor`
     to redirect URLs (for magic links).
   - Create the team, the first mentor, load the content and create the children's profiles:
     ```sh
     SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<publishable key> \
     SUPABASE_SERVICE_ROLE_KEY=<secret key> TEAM_NAME="Đội Magic" \
     MENTOR_EMAIL=<you> MENTOR_PASSWORD=<strong password> \
     PROFILES="Tên1:🦊:1234,Tên2:🐼:5678,Tên3:🦄:9012,Tên4:🐢:3456" pnpm bootstrap
     ```
     The secret key is used only on your machine for this one script. Never put it in Vercel.
2. **Vercel**: import the repository. Set the environment variables `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (the publishable key) and `VITE_TEAM_SLUG=default`. Deploy.
   `vercel.json` handles routing, HTTPS-only headers and a strict Content-Security-Policy.
3. More mentors (up to any number): invite them in Supabase → Authentication → Users → Invite,
   then add their email in the console under **Cài đặt**.

## Changing the content (no code change)

1. Edit `content/course-content.json` (or a copy). Run `pnpm validate-content my-file.json`.
2. In the console, **Nội dung** → choose the file. Errors are listed with the id of the card,
   question or option at fault, and nothing is saved until the file is valid.
3. "Lưu và dùng ngay" makes it the active version. Older versions stay stored and unchanged;
   every answer remembers the version it was given under, so old answers keep their wording.
4. **Xem thử** plays any version as a throwaway profile; nothing is recorded.

A new level (8, 9, …) is just another entry in `levels` with the next `order`; it appears on the map
locked until the previous level is done or the mentor opens it.

### Content fields the app relies on

All optional and in the schema, so no question is special-cased in code. Since content
`2026-10-25.10` they live in the mentor's master file (RFP v1.1, Appendix C).

| Field | Where | What it does | Used in 2026-10-25.10 |
| --- | --- | --- | --- |
| `placeholder` | any part | sentence starter in the empty field | L1F1a, L1F2, L1F4, L2F4b |
| `required` / `optional` | any part | rules below | L1F1a required; L5F3b optional; L6F4 "Trả nợ" optional |
| `context: [{questionId, partId}]` | form question | earlier answers shown above the input ("Ở câu trước con chọn: a · b"); hidden when nothing was picked | L1F4 ← L1F3, L5F2 ← L4F2, L5F1 |
| `optionsFrom: {questionId, partId}` | `single_choice` part | only the options ticked or added in an earlier multi choice, plus "Khác" | L7F2a ← L7F1 |
| `copyFrom: {homeworkId, fieldId, groupId, toGroupId}` | `item_list` part | "Chép giá từ Bài về nhà" fills empty rows, never overwrites | L6F2 ← H4 materials |
| `minRows`, extra text `fields` | `item_list` part | rows shown from the start; rows with extra fields are numbered cards; empty rows never saved | L3F3 |
| `noPrice`, `showTotal`, `totalLabel` | `item_list` group / part | no price box; running total | L6F2 |
| `showAnswer`, `rowLabel` | homework | earlier answer on the item; repeated row names | H2 ← L3F2; "Bạn {n}", "Ngày {n}" |
| `submission[]` | top level | the competition template map for the console's "Bài nộp" view | 17 sections |
| `ui.correctLines / wrongLines / cheers / oops` | `ui` | lists; one picked at random | quiz feedback and pop-up |
| `levels[].minutes` | level | intro "khoảng N phút"; computed from the counts when absent | – |
| `homework.remindAfterLevels`, `characters[].images`, `levels[].character / sticker`, `cards[].audio` | | reminders, real artwork, recorded read-aloud | – |

**Form rules** (Appendix B, as corrected for .10): choice and number parts must be answered unless
`optional`; a question made only of text parts needs at least one answer ("Con trả lời một chút,
hoặc bấm “Chưa biết” nhé."); in a question that also has choices, text is optional unless
`required`; an empty part labelled "Vì sao…" / "Lý do…" gets one nudge and the second tap goes
through. One "Chưa biết" per question covers whatever is not answered yet.

Content history: `2026-10-25` (supplied) → `.1` (playtest fixes) → `.3` (mentor) → `.10` (mentor, RFP
v1.1) → `.11` (L1F3 becomes a multi choice, 1–3 picks). Wording notes from the playtests: [`docs/playtest-2026-10-25.md`](docs/playtest-2026-10-25.md).

### Adding a new question type

1. Schema: add the name to `$defs/part/properties/type/enum`, a `$defs/<name>Part` definition and an
   `if/then` line in `$defs/part/allOf`. Then run `pnpm gen:validator` (the schema is compiled to
   plain JavaScript so it runs under the Content-Security-Policy; a unit test fails if you forget).
2. `src/content/types.ts`: add the part interface to the `Part` union.
3. `src/domain/answers.ts`: add the value shape, a `checkPart` case and a `formatPart` case
   (TypeScript points at every switch that needs one).
4. `src/player/parts/`: add the input component and a case in `parts/index.tsx`.
5. Tests in `tests/answers.test.ts`.

## How it works

```
src/
  content/   types, JSON-schema + semantic validation, UI strings (content `ui` wins over defaults)
  domain/    answer values and rules per type, seeded shuffle, level status
  api/       PlayerApi / MentorApi; supabase.ts, local.ts (in-browser), preview.ts (in-memory), queue.ts
  player/    profile picker, PIN, map, level flow, quiz, form, review, homework; parts/ = input types
  mentor/    console pages, derive.ts (compare, timings), exports.ts (PDF, CSV, JSON)
  art/       placeholder SVG characters and costumes, Drắc Nhí, candy, pumpkin, ghost, stickers; skin.tsx
supabase/migrations/   tables, RLS, server functions
```

- **Children never touch tables.** The `anon` role can only call `player_*` functions with a
  session token from `player_login(profile, PIN)`. Tokens and PINs are stored hashed (SHA-256 and
  bcrypt); 5 wrong PINs lock a profile for 15 minutes. Changing a PIN signs the profile out everywhere.
- **Mentors** sign in with Supabase Auth (password or magic link; Supabase rate-limits these),
  read their team's rows through row-level security and change things only through `mentor_*`
  functions. Every row carries `team_id`, so more teams can share one deployment later.
- **Evidence.** Quiz attempts are append-only (a trigger refuses updates); the first attempt is never
  overwritten, and each stores the option order shown and its seed. Form answers are versioned: one
  version per visit to a question (typing in one sitting does not make dozens), every later edit a
  new version. Content versions are immutable.
- **Offline.** Every write goes to a queue in `localStorage` first and is retried with backoff and
  when the browser comes back online; writes are idempotent. The pill at the top shows
  "Đã lưu" / "Đang lưu…" / "Chưa lưu được…" for the parent.
- **Resume.** The position in a level (card, quiz question, form question) is saved after every
  step, so the child continues on any device. An answered quiz question stays answered after a reload.
- **Exports.** PDFs are built in the browser with pdfmake and embedded Roboto (full Vietnamese
  support). CSVs carry a UTF-8 BOM for Excel. PINs are never sent to the browser, so no export can
  contain them.
- **Logging.** Uncaught client errors and refused writes go to the `error_log` table, shown in the
  console under Cài đặt, with the message, page and kind of write, never answer text. Nothing is
  sent to a third-party service.
- **Seasonal skin (DR-08).** `teams.settings.skin` ("halloween" by default, switch in Cài đặt).
  `<html data-skin>` swaps the colour tokens; costumes, mascot, candies, the glowing pumpkin, the
  ghost on the progress dots and the quiz pop-up only appear with the skin on. The pop-up lasts
  1.8 s, never takes a tap, and is skipped under reduced motion. The app stays light in OS dark mode.
- **Trial-run reset (FR-M-15).** Cài đặt → "Xoá kết quả chạy thử": export first, then answers,
  attempts, timings and progress are deleted; profiles, PINs, level locks and settings stay.
  `teams.data_epoch` goes up by one; every write carries the epoch it was made in, and the server
  refuses older ones, so a phone that was offline during the reset cannot upload old answers.
- **Bundles.** Children download about 160 KB gzipped (app + Supabase client). The console and
  the PDF library load only at `/mentor`.

## Requirement coverage (RFP v1.1)

| Area | Status |
| --- | --- |
| FR-P-01 … 28 | All Must done. Should: test profile and preview (P-04/M-10), stickers (P-08), read-aloud (P-14), mascot reactions and pop-up (P-18, no sound), links between answers (P-23), homework capture (P-27). |
| FR-M-01 … 16 | All Must done; Should: Zoom sheet (M-11), team-scoped data (M-12), trial-run reset (M-15), submission view (M-16). Not done: M-14 Google Sheet import (Could). |
| FR-C-01 … 05 | Done. Art is SVG drawn in code, overridable by files. `sdg_picker` kept (Could); the children no longer see SDGs, the list is shown to the mentor in "Bài nộp". |
| DR-01 … 08 | Done, including the Halloween skin (DR-08) with placeholder art (original, client-owned). |
| NFR | 01–03, 05, 06, 08, 09, 12 done. 07: free tier. 10: player strings externalised and overridable; mentor console strings are inline Vietnamese. 11: keyboard-operable, labelled controls, reduced motion respected. 04 (Could): writes queue offline, but reloading the app offline is not supported. |
| Acceptance | `e2e/acceptance.spec.ts` automates tests 1–13, 15–20 and FR-M-15. Test 14 (old Android over 4G) needs a real device. |

## Licences

Code: owned by the client. Third-party packages are open source (MIT/Apache/BSD/OFL): React,
React Router, Supabase JS, Ajv, pdfmake (MIT; bundles Roboto under Apache 2.0), Nunito font
(SIL OFL, self-hosted via @fontsource). No external CDNs or font services are contacted.
