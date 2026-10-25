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

Demo profiles An / Bình / Chi / Dũng: tap a picture to play (codes 1111 / 2222 / 3333 / 4444 apply
only if "Cần mã khi vào" is switched on in Cài đặt). Mentor console:
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
Studio (table browser) is at http://127.0.0.1:54323. Everything is in the `sec_minicourse` schema
(see "How it works"); a local database made before that change needs one `npx supabase db reset`.

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

## Deploy (Lightsail + Supabase cloud)

The app is static. GitHub Actions builds it into a Docker image (nginx, non-root, port 3000
inside the container) and runs it on the shared Lightsail instance at `127.0.0.1:3002`, behind
Caddy, as in `mika-cms-webapp/docs/deployment-standard.md` ("Adding a project"). All data is in
Supabase, in the app's own schema `sec_minicourse`, inside a Supabase project that other apps
share. Files: `Dockerfile`, `deploy/nginx.conf`, `deploy/security-headers.conf`,
`.github/workflows/deploy.yml`, `deploy/supabase-schema.sql`, `deploy/launch-check.sql`.

Production address: **https://tiemvongtay.chabinuhandmade.com** (Cloudflare DNS, an A record set to
**DNS only**, grey cloud, so Caddy on the instance gets the certificate). Children's codes: off.

The container is capped at 64 MB and a quarter of a CPU. If the shared Supabase project is on the
free plan, it pauses after 7 days without use by any of its apps, and then every app is down
until someone presses **Restore project** in the dashboard. The free plan keeps no backups, so
export the JSON from **Xuất dữ liệu** now and then.

Have ready: the mentor's email (it may already have an account in the shared project), SSH
access to the instance as `ubuntu`, and the shared project's URL, publishable key and secret key
(Project Settings → API Keys).

### 1. Supabase: the app's schema in the shared project (once)

The project is shared, so **leave its project-wide settings alone**: sign-ups, Site URL and the
password policy stay as they are. The app does not need them changed (see "Shared project" below).
Do not use `supabase db push` or `supabase migration repair` either: the CLI keeps one migration
history per project, and other apps' history would conflict with this one. The SQL is applied by
hand instead.

1. **SQL Editor** → New query → paste all of `deploy/supabase-schema.sql` → Run. It creates the
   schema `sec_minicourse` with its tables, row-level security, functions and grants, in one
   transaction; it touches nothing in `public` or any other schema and inserts no data. If the
   schema already exists it stops at the first line and changes nothing.
2. **Only after step 1**: Project Settings → Data API → **Exposed schemas** → add
   `sec_minicourse` → Save. The order matters: if an exposed schema does not exist, the Data API
   fails to start (HTTP 503) for **every app in the project**. For the same reason, never drop or
   rename the schema while it is exposed; remove it from the list first.
3. Authentication → URL Configuration → **Redirect URLs**: add
   `https://tiemvongtay.chabinuhandmade.com/mentor` (for the mentor's email sign-in link). Leave the
   Site URL as it is: the app asks for that address explicitly, and Supabase honours it because it
   is on the list.
4. Create the team, the mentor, the content and the four children, in the order the picker shows
   them, without codes:
   ```sh
    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<publishable key> \
   SUPABASE_SERVICE_ROLE_KEY=<secret key> TEAM_NAME="Đội Magic" MENTOR_LABEL="bố Trí" \
   MENTOR_EMAIL=<mentor email> MENTOR_PASSWORD=<strong password, only for a new account> \
   PROFILES="Đậu:🐯,Go-Han:🐸,Suri:🐬,Bình Minh:🦁" pnpm bootstrap
   ```
   This creates exactly: team "Đội Magic" (Halloween on, team progress on, codes off, the children
   call the mentor "bố Trí"); the content in `content/course-content.json`, active; the four
   profiles; and makes the email a mentor. If the email **already has an account** in the
   project, that account is used as it is, its password is not changed, and the script says
   "MENTOR_PASSWORD was ignored": sign in with the account's own password. Otherwise the account is
   created with `MENTOR_PASSWORD`. No answers, no demo children, no test account. The avatars are
   placeholders: change them in **Các con**. The secret key is used only on your machine, for this
   script and the check below; it never goes into GitHub or the server. The leading space keeps the
   command out of the shell history.
5. Check that the project holds no children's data (read only; exits 1 if it does):
   ```sh
    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret key> pnpm launch-check
   ```
   Or paste `deploy/launch-check.sql` into the SQL Editor: every "children's data" row and the
   "ours in public" row must show 0.
6. More mentors: the person needs an account in the project (Authentication → Users → Add user, or
   their own sign-up), then add their email in the console under **Cài đặt**.

**Shared project, open sign-ups.** Anyone who signs up in the project gets an account, but an
account that is not in `sec_minicourse.mentors` reads no rows (row-level security), and every
`mentor_*` function answers "unauthorized". The children's side does not use accounts at all: it
calls the `player_*` functions with its own session tokens. Children (the `anon` role) can read no
table and call only `player_*`, `public_*` and `report_error`. The sign-in link button never creates
an account (`shouldCreateUser: false`).

**Later schema changes.** A new migration in `supabase/migrations/` is applied the same way: paste
that one file into the SQL Editor. `pnpm gen:schema-sql` rebuilds `deploy/supabase-schema.sql` for
new projects; a unit test fails if it is out of date.

### 2. The server (once)

On a machine with SSH access to the instance (`18.136.67.209`):

1. Check the host prerequisites in the deployment standard are done (Docker log rotation, one
   Caddy file per site, Mika's prune scoped to its own images). Reserve port **3002** (3001 is `tu-lanh-ra-mon`) in its
   allocation table.
2. A deploy key for this project only:
   ```sh
   ssh-keygen -t ed25519 -C "deploy-sec-minicourse" -f ~/.ssh/sec-minicourse_deploy -N ""
   ssh-copy-id -i ~/.ssh/sec-minicourse_deploy.pub ubuntu@18.136.67.209
   ```
3. DNS (Cloudflare): an A record `tiemvongtay` → `18.136.67.209`, proxy status **DNS only** (grey
   cloud), so Caddy gets and renews the certificate itself. Check: `dig +short tiemvongtay.chabinuhandmade.com`.
4. Caddy, on the instance:
   ```sh
   sudo tee /etc/caddy/sites/tiemvongtay.chabinuhandmade.com.caddy >/dev/null <<'EOF'
   tiemvongtay.chabinuhandmade.com {
       encode zstd gzip
       reverse_proxy 127.0.0.1:3002
   }
   EOF
   sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
   ```
   Until the container runs, the domain answers 502.

### 3. GitHub repository (once)

A private repository, then the variables and the one secret the workflow reads:

```sh
gh repo create dungdt88/sec-minicourse --private --source=. --remote=origin
gh variable set DEPLOY_HOST --body 18.136.67.209
gh variable set DEPLOY_USER --body ubuntu
gh variable set VITE_SUPABASE_URL --body https://<ref>.supabase.co
gh variable set VITE_SUPABASE_ANON_KEY --body <publishable key>
gh secret set DEPLOY_SSH_KEY < ~/.ssh/sec-minicourse_deploy
git push -u origin master          # the first push runs the tests and deploys
```

| Kind | Name | What |
| --- | --- | --- |
| Variable | `DEPLOY_HOST` | the instance's static IP |
| Variable | `DEPLOY_USER` | `ubuntu` |
| Variable | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co`; also the only Supabase origin the CSP allows |
| Variable | `VITE_SUPABASE_ANON_KEY` | the **publishable** key. It is in the browser bundle by design; row-level security and the database functions decide what it can reach |
| Variable (optional) | `VITE_TEAM_SLUG` | defaults to `default` |
| Secret | `DEPLOY_SSH_KEY` | the private deploy key |

The image goes to GHCR as a **private** package, linked to the repository. The workflow signs the
server in to GHCR with its own token on every deploy, so the package can stay private. If a pull
fails with "denied": the package's settings → Manage Actions access → add this repository (Read).

### 4. Deploy and verify

A push to `master` deploys; `gh workflow run deploy.yml --ref master` redeploys without a commit.
Watch with `gh run watch`. The run fails unless the new container reports healthy.

```sh
# on the instance
docker ps                                                   # sec-minicourse, "healthy"
free -m                                                     # available still > 150 MB
# from anywhere
curl -sI https://tiemvongtay.chabinuhandmade.com | head -3   # 200, server: Caddy
curl -s https://tiemvongtay.chabinuhandmade.com/health       # ok
curl --max-time 5 http://18.136.67.209:3002/                # MUST fail: the port is not public
```

Then open `https://tiemvongtay.chabinuhandmade.com`: the picker shows Đậu, Go-Han, Suri and Bình Minh, and
`https://tiemvongtay.chabinuhandmade.com/mentor` signs the mentor in.

Roll back by re-running the last good **Deploy** run. To try the image locally first:
`docker build --build-arg VITE_SUPABASE_URL=… --build-arg VITE_SUPABASE_ANON_KEY=… -t sec-minicourse .`
then `docker run --rm -p 127.0.0.1:3002:3000 --read-only --tmpfs /tmp sec-minicourse`.

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

- **Own schema.** Every table, function and policy is in the Postgres schema `sec_minicourse`
  (constant `DB_SCHEMA` in `src/api/schema.ts`; every Supabase client uses `db.schema`), so the app
  can share a Supabase project with other apps and creates nothing in `public`. Functions pin
  `search_path = sec_minicourse, extensions, pg_temp`; grants and revokes name only this schema.
- **Children never touch tables.** The `anon` role can only call `player_*` functions with a
  session token from `player_login(profile, PIN)`. By default a child just taps their picture
  (`teams.settings.requirePin` off, at the owner's request); the mentor can require the 4-digit
  code in Cài đặt, and then Tokens and PINs are stored hashed (SHA-256 and
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
- **Team progress (FR-P-29).** The map shows each friend's
  avatar beside the level they are on, one shared candy jar for the team (each quiz question right
  first time is a candy; the jar grows with the furthest level reached), and "Bình vừa xong Màn 2!"
  news for two days; the done screen says "Cả đội: 2/4 bạn đã xong Màn 1". It is cooperative on
  purpose: no ranking, no per-child scores or order, never another child's answers (FR-P-25). Only
  names, avatars, completed levels and the team's candy total leave the server
  (`player_team_progress`). The mentor can switch it off in Cài đặt (`teams.settings.teamProgress`).
- **What the children call the mentor.** `teams.settings.mentorLabel` (Cài đặt → "Các con gọi
  người hướng dẫn là", e.g. "bố Trí"; default "người hướng dẫn") fills `{mentor}` in kid-facing
  text, such as "Bố mẹ nhờ bố Trí đặt mã cho con nhé." The mentor console still says "người hướng dẫn".
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
| FR-P-29 | Team progress (Should, added in RFP v1.1 at the owner's request; FR-P-08 amended): done as described in "How it works", with the mentor switch. The optional finishing-order line (Could) is not built. Leaderboards stay out of scope. |
| Acceptance | `e2e/acceptance.spec.ts` automates tests 1–13, 15–21 and FR-M-15. Test 14 (old Android over 4G) needs a real device. |

## Licences

Code: owned by the client. Third-party packages are open source (MIT/Apache/BSD/OFL): React,
React Router, Supabase JS, Ajv, pdfmake (MIT; bundles Roboto under Apache 2.0), Nunito font
(SIL OFL, self-hosted via @fontsource). No external CDNs or font services are contacted.
