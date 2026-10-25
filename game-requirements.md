# Requirements: "Tiệm Vòng Tay Rừng Xanh" learning game

Request for proposal — version 1.1, October 25, 2026 (replaces version 1.0)
Owner: Richard Dam (parent mentor of the team). Contact: [email / Zalo]
Proposals due by: [date]. Questions are welcome before then.
Content file supplied with this document: `content/course-content.json` (schema 1.0, content version 2026-10-25.12)
Also supplied: `submission-map.md`, which shows which answers feed which part of the competition submission (used by FR-M-16).
Confidential: shared for quotation only. The course content and the children's business idea belong to the team; please do not reuse or publish them.

## What changed in version 1.1

We ran the course ourselves, recorded one child explaining the idea, and checked every form question against the submission template. Please re-quote against this version.

**Content (2026-10-25 → 2026-10-25.12)**
- **Plain language:** every card, quiz and form was rewritten in short, everyday Vietnamese. Terms such as SWOT, lời gộp/ròng, đối thủ and khả thi are gone.
- **No SDG for the children:** they no longer see or pick a Sustainable Development Goal; the mentor picks it from their Level 1 answers. The `sdg_picker` type and the 17 SDG icons are no longer needed (now Could).
- **Logic first:** every quiz is a situation and a decision with a visible result. The story is consistent across levels.
- **28 quiz questions, 4 per level:** the correct option is no longer usually the longest (by length: longest 8, middle 14, shortest 6).
- **27 form questions.** Level 1 asks about the problem before the game. The idea is still open (board game, "magic dictionary", playing together), so questions offer choices plus "Thêm của con" and never assume one product.
- **Questions added to fill the submission template:**
  - L1F1b: players per game.
  - L2F4: what the first set contains and what comes later.
  - L3F3: competitors with strengths and weaknesses, plus where the team's game is better.
  - L5F3b: indirect cost amount.
  - L6F4b: why that good cause.
  - L7F2c: how often a task is done.
- **New part options:** `placeholder`, `required`, `optional`, and item lists with extra text fields and `minRows` (Appendix B).
- **Feedback lines in the content file:** funny quiz feedback lines are now content (`ui.correctLines`, `ui.wrongLines`, `ui.cheers`, `ui.oops`).
- **Links between answers in the content file (from .10):** `context`, `optionsFrom`, `copyFrom`, `showAnswer` and `rowLabel` (Appendix C), so no link is tied to a question id in code.
- **Submission map in the content file (from .10):** a top-level `submission` list (FR-M-16, Appendix F). Version .10 is version .9 plus these fields; the children see no difference.
- **L1F3 is a multiple choice (from .11):** "giúp các bạn những điều gì?", 1–3 picks out of 8 options plus "Khác". L1F4 now asks why for "những điều đó"; its `context` shows all picks.
- **Homework reduced to one optional task (from .12):** the children have enough school homework. Only H2 remains: playtest the paper draft with 3 friends at school, ticks only, with an optional "what to change" box for parents. Its title, "Chơi thử với bạn", replaces "Bài về nhà" in the UI. H1, H3, H4 and H5 and the L6F2 `copyFrom` link are gone; parents check prices themselves.
- **Play on after a level (from .12):** the level complete screen leads with a big "Chơi tiếp: Màn n+1" button (FR-P-28).

**Look and feel**
- **Light theme:** a soft, light pastel theme that stays light when the phone is in dark mode.
- **Seasonal Halloween skin, Should:** the four animals in costumes; a friendly mascot, "Drắc Nhí" (a baby Dracula), who pops up for under 2 seconds after each quiz answer; candies instead of stars. See DR-01, DR-02, DR-05, DR-08 and FR-P-16 to FR-P-19.
- **Funnier system copy:** titles, buttons and feedback are funnier. The course content stays plain.

**Requirements**
- **Changed:** FR-P-10, FR-P-16, FR-P-18, FR-P-19, FR-P-23, FR-P-24, FR-P-28, FR-C-05, DR-01 to DR-05.
- **New:** FR-M-15 (reset answers for a trial run), FR-M-16 (answers grouped by submission section), DR-08 (seasonal skin).
- **Acceptance tests:** tests 16 to 20 added.
- **Appendices:** B, C and D rewritten; Appendix F added (submission map).

**For reference:** we built our own version while waiting for quotes. Ask us for a link if seeing the intended behaviour would help. It is a reference, not a design to copy.

---

## 1. What we are asking for

A small web app, in Vietnamese, that lets four 8-year-old children work through a 7-level "mini course" on running a business, about 10–12 minutes per level, and that records what each child answers about their own business idea so their mentor can turn those answers into a competition submission.

Each level has three parts: a few short story cards that teach one concept each, a short quiz with immediate explanations, and a short form where the child applies the concept to the team's own idea. The app must also give the mentor a console to read all four children's answers side by side and export them.

We will send this document to more than one vendor. Please answer each numbered requirement (Must / Should / Could) with "included", "included as option (price)", or "not included", and quote a fixed price for the Must set.

## 2. Background

**The competition.** The children are in the School Enterprise Challenge, a global schools programme run by the UK charity Teach A Man To Fish. TOMATO Education runs the Vietnamese edition as "Cuộc thi Khởi nghiệp học đường 2026". Teams go through seven milestones over a school year: form a team, explore dreams, write a business idea, write a business plan, launch, run the business and report on it, celebrate. The business idea and plan are worth 40% of the score; the report on actually running the business is the rest.

**The team.** Four children aged 8 (grade 3) at an international school in Ho Chi Minh City. Their idea is still forming: a "Magic" board game, perhaps built around a "magic dictionary" of spells, for primary and secondary students, mainly for fun and for playing together with friends. The course must not assume one product. The mentor is a parent (the owner of this document). Other parents help their own child at home.

**Rules that shape the product.**
- The work must be student-led. Adults may ask questions but must not write the answers. Judges mark work that looks adult-written as insufficient.
- The programme asks teams to minimise the use of AI. The app must therefore never generate, suggest or autocomplete the children's answers. It teaches concepts and records what the children decide.
- Evidence that the children decided matters. Timestamps, answer history and exports are part of the product, not an afterthought.

**Why an app.** Meetings do not work at this age; the children cannot concentrate long enough to cover the plan's topics (problem, feasibility, customers and competitors, SWOT, 4Ps, tasks and roles, start-up capital, revenue, costs and profit). Ten minutes a day at home, with a parent reading the cards aloud, does.

**Where the content comes from.** The course was written and reviewed by the mentor and three outside reviewers (a business educator, a teacher and a parent). It exists as a Vietnamese document and as the JSON file supplied with this RFP. The vendor builds the app; the client supplies and owns all content.

## 3. Goals and success criteria

1. A child can complete one level in about 10–12 minutes with a parent reading the cards aloud, on the parent's phone.
2. A child who answers a quiz question wrongly sees why, in one short paragraph, and can continue without penalty.
3. Every form answer is saved the moment it is given, with a timestamp, and can be revised later with the history kept.
4. The mentor can see, for any form question, the four children's answers side by side and spot where they disagree.
5. The mentor can export each child's answers as a PDF with Vietnamese text rendered correctly, and all data as CSV or JSON.
6. The mentor can replace the content file and add a level 8 without any code change.

## 4. Users and roles

| Role | Who | Count now | Device | Notes |
| --- | --- | --- | --- | --- |
| Child (player) | 8-year-olds, read Vietnamese slowly, type slowly | 4 | Parent's phone or tablet, sometimes a laptop | Profile picked by picture, 4-digit PIN. No email, no password. |
| Parent (helper) | Reads cards aloud, types what the child says | 4 | Same device as the child | No separate login. The app addresses the parent in a few hints ("Bố mẹ đọc thẻ cho con nghe nhé"). |
| Mentor (admin) | Runs the course, reads and exports answers, manages content | 1–3 | Laptop | Email + password or magic link. |
| Reviewer / judge | Reads the exported PDF | — | — | Not a user of the app. |

The data model should allow more than one team (see FR-M-12), because other teams at the same school may reuse the app later.

## 5. Scope

**In scope (MVP, "Must").** Player app for 7 levels with cards, quiz, forms; profiles and PINs; progress saved and resumable; optional playtest sheet view and print; mentor console with progress, answers, compare view, exports; content loaded from the JSON file; hosting set up on the client's account; handover of source code and documentation.

**Should.** In-app capture of playtest results; read-aloud audio for cards; stickers and small rewards; content preview mode; Zoom vote-sheet generator.

**Could.** Offline (PWA) play; multi-team UI; a second UI language; Google Sheet import for content.

**Out of scope.** Building or designing the children's physical board game; any AI or chat feature; the Zoom meeting itself; writing or translating the competition submission; accounts for the general public; native app-store releases (a PWA is fine); advertising, analytics for marketing, social features, leaderboards, in-app purchases.

## 6. The course content

Source of truth: `content/course-content.json`. The numbers below describe version 2026-10-25.9.

| Element | Count | Notes |
| --- | --- | --- |
| Levels (Màn) | 7 | One per day. Order: 1 what a business is; 2 feasibility; 3 customers and competitors; 4 selling (4Ps); 5 revenue, costs, profit; 6 start-up capital and profit sharing; 7 working as a team. |
| Objectives per level | 2–3 | For parents. Shown collapsed. |
| Concept cards | 28 (4 per level) | Short sentences (about 7 words). Several cards have a bullet list and/or a footer line. Key terms carry the English word in brackets. The UI calls them "Thẻ truyện". |
| Quiz questions | 28 (4 per level) | 3 options, exactly one correct, one explanation. Correct answer positions in the file: a 7, b 13, c 8. The app must shuffle option order on every play. |
| Form questions ("Đến lượt đội con") | 27 (3–4 per level) | 7 input types in use, see Appendix B. Every question has a "Chưa biết" (don't know) escape. |
| Homework items | 1 | One optional task, "Chơi thử với bạn" (playtest with 3 friends at school, ticks only). Printable; optional in-app capture (Should). The app handles any number of items. |
| Characters | 4 + mascot | Sóc Hạt Dẻ (squirrel, maker), Gấu Mật (bear, keeps the money, loves honey), Thỏ Bông (rabbit, seller), Cú Mèo (owl, "what if…?"). The mascot Drắc Nhí is UI art only and does not appear in the story (DR-08). |
| SDG list | 17 | Titles and captions stay in the file for the mentor's reference. The children never see them; no icons are needed. |
| UI strings | 31 | Vietnamese, supplied in the file, including four lists of short feedback lines to pick from at random. The vendor may propose additions. |

The story is deliberately about a friendship-bracelet shop run by four animals, not about a board game, so the examples teach the concept without handing the children their answers. The forms are about the children's own game.

Content will change. The first real run (October 26 to November 2) will show which cards are too long and which questions confuse; a revised content version will follow. Levels 8 and later will be added for the next milestones (launching and running the business, November 2026 to February 2027).

## 7. Functional requirements — player app

Priority: M = Must (MVP), S = Should, C = Could.

### 7.1 Entry and profiles

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-01 | The app opens on a profile picker: one large tile per child showing the child's chosen avatar and given name or nickname. No email, no username. | M |
| FR-P-02 | A profile is unlocked with a 4-digit PIN set by the mentor. The PIN is remembered on the device so the child does not retype it daily; "switch profile" is available. | M |
| FR-P-03 | Profiles, avatars and PINs are created and changed only in the mentor console. Children cannot create profiles. | M |
| FR-P-04 | A "test" profile exists for the mentor to play through content without recording data (see FR-M-10). | S |

### 7.2 Home and progress

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-05 | Home shows the 7 levels as a path or map with three states: done, available, locked. Levels unlock in order; the mentor can unlock any level manually. A completed level can always be replayed. | M |
| FR-P-06 | The next available level is visually highlighted ("Hôm nay: Màn 3"). | M |
| FR-P-07 | Progress is saved server-side per profile at the granularity of a single card, quiz question or form question, so a child who stops mid-level resumes at the same place on any device. The two-sitting pattern (cards + quiz today, form tomorrow) must work. | M |
| FR-P-08 | Each completed level awards a sticker or badge shown on the map. No points, no lives, no timers, no "game over", no comparison between children. | S |
| FR-P-09 | A small button on the map, labelled with `homework.title` ("Chơi thử với bạn"), opens the homework (FR-P-26). Hidden if the content has no homework. | M |

### 7.3 Level intro and cards

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-10 | Level intro: level title, a character illustration, chips for the number of cards, quiz questions, form questions and estimated minutes, a start button (`ui.start`), and the parent-facing objectives behind a collapsed "Mục tiêu (cho bố mẹ)" disclosure. | M |
| FR-P-11 | Cards are shown one per screen: title, body, optional bullet list, optional footer line. Large type (body 18 px or larger on phones), generous line height, Next and Back. A progress indicator shows "Thẻ 2/4". | M |
| FR-P-12 | A one-line hint at the first card of each level says a parent should read the cards aloud. It can be dismissed per device. | M |
| FR-P-13 | English terms in brackets, e.g. "khách hàng (customer)", render as-is; the vendor may style them lighter. | M |
| FR-P-14 | Read-aloud audio for every card: either recorded Vietnamese voice (preferred) or on-device Vietnamese text-to-speech. Play/pause per card. Content changes must not require re-recording of unchanged cards. | S |

### 7.4 Quiz

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-15 | One question per screen; the three options are shuffled on every play (seeded per attempt and stored, so the mentor can reconstruct what the child saw). Option labels A/B/C in the content file are identifiers only and must not be displayed as the fixed order. | M |
| FR-P-16 | Tapping an option locks the answer and shows feedback immediately. The heading is one line picked at random from `ui.correctLines` or `ui.wrongLines` (falling back to `ui.correct` / `ui.wrong`), followed in both cases by the explanation text. Then a "Tiếp" button. The chosen option gives a small bounce when right and a wobble when wrong. The child cannot change the answer after tapping; there is no penalty for a wrong answer. | M |
| FR-P-17 | The first attempt at each question is recorded immutably (question id, option shown positions, chosen option, correct or not, timestamp). Replays are recorded as further attempts and never overwrite the first. | M |
| FR-P-18 | The mascot reacts to every answer. In the feedback box it is happy when right and "oops" when wrong. A short pop-up also plays over the page: when right, it jumps in with a one-word cheer from `ui.cheers` while sweets and bats fly out; when wrong, it wobbles with "Ối!" from `ui.oops` while two bats flutter off. Limits are in DR-05. Sound effects are optional and must be mutable; sound off by default. | S |
| FR-P-19 | Quiz end screen: "Xong câu đố! Thu kẹo nào!" with one candy per question answered right on the first try (e.g. 3 candies, 1 empty wrapper), shown only as encouragement, never as a pass/fail. | M |

### 7.5 Forms ("Đến lượt đội con")

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-20 | One question per screen, with the level's intro line where the content provides one, and the hint text in smaller type. Multi-part questions (e.g. a choice plus "Vì sao?") show their parts on one screen in order. | M |
| FR-P-21 | The eight input types in Appendix B are implemented with the validation rules given there. Every question has a "Chưa biết" option that satisfies the question; it is always the last option and visually quieter. | M |
| FR-P-22 | Each answer is autosaved on change with a timestamp. A review screen at the end lists all answers of the level with an "Sửa" (edit) link per question, then "Nộp phiếu". After submission the child can still edit until the mentor locks the level; every edit is kept as a new version. | M |
| FR-P-23 | Links between answers, driven by content fields (Appendix C), never by question ids in code. In the current content: `context` makes L1F4 show the picks from L1F3 ("Ở câu trước con chọn: …", hidden when there are none) and L5F2 show the price from L4F2 and the cost from L5F1, read-only. `copyFrom` (offer to copy homework rows into an item list, filling empty rows only) stays supported but is unused since .12. `optionsFrom` makes L7F2a list only the tasks ticked or added in L7F1 (plus "Khác"). `showAnswer` makes homework H2 show the two questions chosen in L3F2. | S |
| FR-P-24 | Text inputs accept the device's own Vietnamese keyboard and dictation; no custom keyboard. Maximum lengths from the content file are enforced softly (counter), not with a blocking error. Under the first text field of each question, a one-line tip tells parents to use the keyboard's microphone for voice typing. A part's `placeholder` (a sentence starter) is shown in the empty field. | M |
| FR-P-25 | The app never prefills, suggests, ranks or autocompletes form answers, and never shows another child's answers to a child. | M |
| FR-P-26 | Homework screen: renders the items from the content file (currently one; no number badge when there is only one), plus an "In" (print or save as PDF) action producing an A4 sheet with a tick table per friend and lines for "what to change". | M |
| FR-P-27 | In-app homework capture using the `capture` definitions in the content file (repeat groups, checkboxes, text; item lists and tallies stay supported). The two answer boxes per friend appear only for the questions the child chose in L3F2 (`showAnswer`); the ticks work without them. Saved per profile like form answers. | S |
| FR-P-28 | Level complete screen: sticker, `ui.levelDone` ("Hú hú! Xong Màn {n}!"), the characters cheering, and the line "Màn n+1 đã mở. Chơi tiếp luôn, hay để mai cũng được!". The first and largest button is "Chơi tiếp: Màn n+1", which opens the next level's intro. It is followed by "Gửi bài" when answers are only on the device, the optional playtest (`ui.homeworkReminder`, after level 3 only), and "Về bản đồ". After the last level, "Về bản đồ" is the main button. | M |

## 8. Functional requirements — mentor console

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-M-01 | Mentor login with email and password or magic link; at least 3 mentor accounts per team. All console pages are inaccessible without login. | M |
| FR-M-02 | Profiles: create, rename, pick avatar, set or reset PIN, archive. Fields are limited to given name or nickname and avatar; no date of birth, no contact details for children. | M |
| FR-M-03 | Level control per profile and for the whole team: unlock, lock, reset a level (keeping history), lock a level's form for editing. | M |
| FR-M-04 | Dashboard: for each child, levels done, last activity, time spent per level split into cards / quiz / form (from section start and end timestamps). | M |
| FR-M-05 | Quiz detail: for each child and question, the first-attempt result and the chosen option text, so the mentor can see which misconceptions appeared. Aggregate per question across the team ("3 of 4 wrong on L5Q3"). | M |
| FR-M-06 | Form answers: per child, all answers with timestamps and version history. | M |
| FR-M-07 | Compare view: per form question, the four children's latest answers side by side. For choice and number questions, a flag when the answers are not all the same; a one-click list of all flagged questions (this is the Zoom voting list). | M |
| FR-M-08 | Export per child: a PDF of all form answers and homework capture grouped by level, with question text, answer, timestamps and "edited n times", in Vietnamese with embedded fonts. Export for the team: CSV and JSON of everything (profiles minus PINs, attempts, answers, versions, timings). | M |
| FR-M-09 | Content management: upload a new `course-content.json`; the app validates it against the schema, lists errors with ids, and on success stores it as a new content version. Existing answers keep a reference to the content version they were given under and remain readable. | M |
| FR-M-10 | Preview mode: play any level of any content version as the test profile; nothing is recorded. | S |
| FR-M-11 | Zoom sheet: generate a one-page view (printable) listing the flagged questions from FR-M-07 with each option as a voting line and space to note the vote count. | S |
| FR-M-12 | Multi-team: every record carries a team id; one team in the UI for the MVP. A later version may add team switching for a mentor who runs two teams. | S (model) / C (UI) |
| FR-M-13 | Data deletion: a mentor can export and then permanently delete a profile's data, and the team's data, from the console. | M |
| FR-M-14 | Google Sheet import as an alternative to JSON upload, using a sheet template the vendor defines. | C |
| FR-M-15 | Reset for a trial run: delete all children's answers, attempts and timings while keeping profiles, PINs and settings, after offering an export. Devices that saved answers locally must not upload pre-reset answers again. | S |
| FR-M-16 | Submission view: the latest answers of all four children grouped by the sections of the competition template, following `submission-map.md` (Appendix F), so the mentor can fill one section at a time. Printable. | S |

## 9. Content and data model

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-C-01 | All course content (levels, cards, quiz, forms, homework, characters, SDG list, UI strings) comes from the JSON file. No level, card, question or option is hard-coded. Adding level 8 is a content change only. | M |
| FR-C-02 | The vendor delivers a JSON schema (draft 2020-12 or equivalent) for the content file, matching Appendix C, and uses it for upload validation. The client may extend the schema with new question types in future; the design should make a new type a contained addition. | M |
| FR-C-03 | Content versions are immutable once an answer references them. | M |
| FR-C-04 | Answer records store: team, profile, content version, level id, question id, part id, value (typed), "Chưa biết" flag, created and updated timestamps, version number, device type. Quiz attempt records store: attempt number, displayed option order, chosen option, correct flag, timestamps. Section timing records store: profile, level, section, start, end. | M |
| FR-C-05 | Images: character art (with seasonal costumes), the mascot, stickers, candies and the level map live in an `assets/` folder referenced by path. SDG icons are no longer needed (children do not pick an SDG); if the vendor keeps the `sdg_picker` type, the official-icon licence note from version 1.0 applies. | M |

## 10. Design and tone

| ID | Requirement | Priority |
| --- | --- | --- |
| DR-01 | Visual style: light, soft and cute; a picture book, not a casino. Mobile-first, portrait. The app stays light even when the device is in dark mode. Colours come from one set of theme tokens, so a seasonal skin (DR-08) can be switched on and off. | M |
| DR-02 | Four original character illustrations (squirrel, bear, rabbit, owl) consistent in style, each with at least three expressions: neutral, happy, thinking; and one "oops". Plus the mascot Drắc Nhí (neutral, happy, oops). A level map or path. One sticker per level. A candy in filled and empty states. The client owns the artwork. Licensed stock art is acceptable if the licence allows this use and is documented. | M |
| DR-03 | Tone of system copy (titles, buttons, feedback, toasts): friendly, short, plain Vietnamese for an 8-year-old, and a little funny ("Trúng phóc!", "Cửa này còn khóa!"). Parent-facing notes stay plain and clear. No English UI strings. Use the strings in the content file; propose additions in the same register. The course content itself is not rewritten by the vendor. | M |
| DR-04 | Readability: body text at least 18 px on phones; line length at most about 40 Vietnamese syllables; tap targets at least 48 × 48 px; colour contrast at least 4.5:1 for text; no information carried by colour alone. Vietnamese diacritics must render correctly in the chosen fonts (test "ỡ ờ ở ẵ ậ ệ ự"). | M |
| DR-05 | Nothing moves while the child is reading a card text. Small animations are under 600 ms. The quiz-feedback pop-up (FR-P-18) may last up to 2 s, must never block a tap, and must not hide the explanation once it has finished. Every animation is skipped when the OS asks for reduced motion. | M |
| DR-06 | No dark patterns: no streaks, no countdowns, no "come back or lose", no notifications to children. | M |
| DR-07 | Design review: the vendor presents clickable screens for level 1 (profile picker, home, 2 cards, 1 quiz question with both feedback states, 2 form questions, level complete) before building the rest. | M |
| DR-08 | Seasonal skin "Halloween": cream, lilac and pumpkin colours with a faint pattern of stars, moons and bats; costumes on the four animals (witch hat, pumpkin cap, bat bow, wizard hat); the mascot Drắc Nhí, a friendly baby Dracula who is never scary; today's level on the map shown as a glowing pumpkin; a small ghost riding the progress bar; candies as quiz rewards. The mentor can switch the skin off in the console; with it off, the same layout uses the plain light theme, without costumes. | S |

## 11. Non-functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-01 | Platform: responsive web app. Must work on iOS Safari 16+, Android Chrome (devices up to four years old), and desktop Chrome, Edge and Safari. PWA installability is welcome; app-store release is not required. | M |
| NFR-02 | Performance: first meaningful screen within 3 seconds on a mid-range Android phone over 4G; moving between cards or questions feels instant (under 200 ms, no network wait). Total asset weight for a level under 2 MB after caching. | M |
| NFR-03 | Reliability: no answer is lost if the network drops mid-level; the app queues writes and retries, and tells the parent if something is still unsaved. | M |
| NFR-04 | Offline play of already-loaded levels with deferred sync. | C |
| NFR-05 | Security: HTTPS only; PINs stored hashed; mentor passwords hashed with a modern algorithm; rate limiting on PIN and login attempts; no answer data readable without the child's PIN or a mentor session; no third-party trackers, ads or analytics SDKs. | M |
| NFR-06 | Privacy: the only personal data about a child is a given name or nickname, an avatar choice and the answers. No birth dates, photos of children, contact details or location. Data is used only for this course. The client is the data controller; the vendor processes data only to build and support the app. Vietnam's personal data rules (Decree 13/2023/NĐ-CP) apply; parents consent to their child's use. | M |
| NFR-07 | Hosting: on accounts owned by the client (e.g. the client's own Firebase, Supabase, Vercel, AWS or similar), set up by the vendor, with expected monthly cost stated in the proposal. Target: under USD 10 per month at this scale, ideally free tier. | M |
| NFR-08 | Ownership: full source code, build scripts, infrastructure configuration, content schema, design files and artwork are delivered to the client under an assignment of IP (or an MIT-style licence for the code if the vendor prefers to reuse their framework; state which). Third-party components must be open-source or licensed for the client's continued use at no extra cost. | M |
| NFR-09 | Maintainability: a README that lets a competent developer run the project locally, deploy it, and swap the content file within an hour. Automated tests for content validation and for the form input types. | M |
| NFR-10 | Localisation: all UI strings externalised; Vietnamese is the only language in the MVP. The structure should allow an English UI later. | S |
| NFR-11 | Accessibility: keyboard operable on desktop; screen-reader labels on controls; respects the OS "reduce motion" setting. | S |
| NFR-12 | Logging: server logs do not contain answer text; errors are reported to the mentor console or an email, not to a third-party SaaS that stores children's data. | M |

## 12. Deliverables, milestones and acceptance

**Deliverables**
1. Proposal (see section 14).
2. Design review package: clickable screens for level 1 (DR-07) and the character art direction.
3. MVP release: all Must requirements, deployed on the client's hosting, with the latest supplied content version loaded and four profiles created.
4. Source repository, README, content schema, test suite, design files, artwork, asset licence notes.
5. A 30-minute handover call and written answers to follow-up questions for 3 months (warranty, see section 14).

**Acceptance tests (the client will run these before accepting the MVP)**
1. On an iPhone and on an Android phone, pick a profile, enter the PIN, complete level 1 end to end in under 15 minutes with a parent reading the cards aloud.
2. Stop mid-quiz on the phone, open the same profile on a laptop, continue from the same question.
3. Answer a quiz question wrongly: see the explanation, continue, and find the first attempt recorded as wrong in the console; replay the level and confirm the first attempt is unchanged and the option order differs.
4. On L6F4, enter 60 and 30 and confirm the app blocks continuing until the total is 100; enter 50 and 50; with "Vì sao…?" empty, see one gentle nudge, then continue on the second tap.
5. On L3F2, pick a leading question and see the gentle feedback once; pick two non-leading ones and continue.
6. Choose "Chưa biết" on a text question and on a number question and continue.
7. Edit a submitted answer; confirm the console shows both versions with timestamps and the compare view shows the latest.
8. In the compare view, give two children different answers on L4F1 and see the question flagged; see it in the flagged list.
9. Export one child's PDF; open it on a phone; Vietnamese diacritics render correctly; timestamps are present.
10. Export CSV and JSON; confirm PINs are absent and every answer is present.
11. Upload a content file with one quiz question that has two correct options: upload is rejected with the question id named. Upload a valid file with a new level 8: it appears on the map, locked.
12. Lock level 2's form for a profile; confirm the child can read but not edit.
13. Turn off the network mid-form, answer two questions, turn it on: both answers are saved.
14. Run the app on a 4-year-old Android phone: first screen under 3 seconds on 4G.
15. Delete a profile from the console; confirm an export was offered first and no data remains.
16. On L1F1, choose a number of players but leave the text empty: the app asks for the text. Fill it and continue.
17. On L3F3, three numbered rows (name, "Hay ở chỗ…", "Chưa hay ở chỗ…") show without tapping "Thêm dòng". Fill rows 1 and 3 only, pick one "hơn ở chỗ nào" option, and continue. The review and the export show both rows with their strengths and weaknesses, and no empty row.
18. On L5F3, tick one option and leave the amount empty: the child can continue.
19. On L7F2, the task list shows only tasks ticked in L7F1, while "Bao lâu làm một lần?" still shows its four options.
20. With the OS set to reduce motion, answer a quiz question: no pop-up appears and the explanation shows at once. With it off, the pop-up finishes within 2 s and buttons stay tappable throughout.

## 13. Timeline

What is fixed:
- Content version 2026-10-25.9 is ready now (supplied with this RFP). It changes as we learn; the vendor loads the latest supplied version at launch.
- The children's first run of the course is October 26 to November 2, 2026, and the business idea and plan are due November 3. The first run will go ahead on paper if the app is not ready; the content will be revised from what we learn.
- The app will be used for the revised run and for the next milestones (launch, operations and the annual report, November 2026 to February 2027), and may be reused by other teams at the school.

What we ask from you: the earliest realistic date for (a) the level-1 design review and (b) the MVP, and what you would need from us by when. A proposal that delivers the design review within one week of award is strongly preferred.

## 14. What your proposal must include, and how we will compare proposals

Your proposal should contain:
1. A response to every numbered requirement: included / option with price / not included, with notes.
2. A fixed price for the Must set, and itemised prices for each Should and Could item.
3. A timeline with the two milestones in section 13 and your assumptions about client turnaround.
4. The team: who designs, who builds, who tests; who is the single point of contact.
5. Technical approach: stack, hosting plan on the client's account, estimated monthly running cost, how the content file is loaded and validated, how exports are generated.
6. How content updates work after launch, and what (if anything) they cost.
7. Warranty and support: we expect 3 months of bug fixing after acceptance included; state what is covered and the response time.
8. IP and licensing terms (see NFR-08).
9. Two examples of previous work for children or in education, with links or screenshots.
10. Risks you see, assumptions you are making, and questions for us.

We will score proposals as follows:

| Criterion | Weight | What we look at |
| --- | --- | --- |
| Fit for 8-year-olds | 30% | Readability, tone, simplicity of interaction, quality of the level-1 screens or references |
| Coverage of Must requirements | 25% | How many are included without caveats; quality of the content-driven design |
| Price | 20% | Fixed price for the Must set and running cost |
| Timeline | 15% | Earliest credible design review and MVP dates |
| Ownership and maintainability | 10% | Source handover, documentation, ease of content updates |

## 15. Assumptions and open points

- The client supplies all Vietnamese content and any future levels, in the JSON format; the vendor may propose schema improvements.
- The Halloween skin (DR-08) matters most before mid-November; if it cannot ship by then, quote the plain light theme first and the skin as an option.
- Character art is created by the vendor (or licensed) and owned by the client.
- Read-aloud audio, if recorded, is in a neutral Vietnamese voice; the client reviews one sample card before full recording.
- The competition deadline of November 3 is being confirmed with the organiser; it does not change the requirements.
- Hosting accounts will be created by the client before the build starts; the vendor tells us which services to create.

---

## Appendix A — Screen flow

```
Profile picker → PIN → Home (level map, "Chơi thử với bạn" button)
  → Level intro (objectives collapsed)
    → Card 1 … Card n (Next/Back, read-aloud)
    → Quiz Q1 … Qn (tap → feedback + explanation → Next)
    → Quiz end (candies)
    → Form intro (if any) → Form Q1 … Qn (autosave) → Review → Submit
    → Level complete (sticker) → "Chơi tiếp: Màn n+1" → next level intro, or → Home
"Chơi thử với bạn" (optional playtest: view, print, capture)
Mentor console: Login → Dashboard → Profiles | Levels | Quiz results | Form answers | Compare | Exports | Content | Settings
```

## Appendix B — Form question types and where they occur

Common to all parts:
- **`label`** is shown above the part.
- **`placeholder`** is a sentence starter shown in an empty field.
- **`required: true`** must be filled before Next, unless the question is answered "Chưa biết".
- **`optional: true`** never blocks Next.
- **"Vì sao" nudge:** an empty text part whose label starts with "Vì sao" or "Lý do" gets one gentle nudge, and the second tap on Next goes through.
- **Choice and number parts** must be filled unless `optional`.
- **Text parts** in a question that also has choice or number parts are not required unless marked `required`.
- **A question made only of text parts** cannot be passed empty: at least one must be filled, or the question answered "Chưa biết". The app says so with a short message ("Con trả lời một chút, hoặc bấm \"Chưa biết\" nhé.").
- **Every question** therefore ends up with an answer or a "Chưa biết"; nothing is skipped silently.

| Type | Behaviour and validation | Used in (content 2026-10-25.12) |
| --- | --- | --- |
| `text` | Text area; `maxLength` soft limit with counter; device keyboard and dictation. | L1F1a (required, placeholder), L1F2 (placeholder), L1F4 (placeholder), L2F1b, L2F3a, L2F4b (placeholder), L3F4a, L3F4b, L4F1b, L4F2b, L6F1b, L6F3b, L6F4b, L7F2b, L7F3a, L7F3b |
| `single_choice` | Large option tiles; exactly one; an option with `allowText: true` ("Khác") reveals a short text field. | L1F1b, L2F1a, L2F3b, L3F1a, L3F1b, L4F1a, L7F2a, L7F2c |
| `multi_choice` | Tick tiles; `min` and optional `max` enforced with a clear message ("Chọn nhiều nhất 2"); `allowAddOwn` lets the child add their own options as removable chips. | L1F3 (max 3), L2F2, L2F4a (add own), L3F3edge (add own), L4F3, L4F4, L5F3a, L6F3a (max 2), L7F1 (add own), L7F4 |
| `number` | Numeric keypad; integer; unit label ("nghìn đồng"); `min`/`max`. Negative allowed only where `min` is negative (L5F2, with a +/− toggle). Amounts typed as full đồng (e.g. 12000) trigger a hint offering 12 nghìn. | L4F2a, L5F1, L5F2, L5F3b (optional), L6F1a |
| `pick_n` | Tick exactly `n` options; options may carry `leading: true` with a `feedback` string shown once, gently, when ticked; the child may keep the choice. The chosen texts are reused on the playtest sheet. | L3F2 |
| `item_list` | Grouped list of rows. A row has a `name`, an optional `price` (with a running total if `showTotal`), and any further `fields` as short text inputs. A row with extra fields is shown as its own numbered card ("Thứ 1"). `minRows` rows are shown from the start. Add/remove rows up to `maxItemsPerGroup`. Rows are stored without gaps; empty rows are ignored in review and exports. | L3F3list (name, good, bad; minRows 3), L6F2 (3 groups, price, total) |
| `sum_split` | Numeric fields that must add up to `total`; running total shown; continue disabled until exact; a field with `allowText` has a short text beside it ("Ghi tên việc"). | L6F4a |
| `sdg_picker` | Grid of 17 goals; one selection. Not used by the current content; keep only if it costs nothing (Could). | — |

Homework capture (Should) adds `repeat`, `checkbox` and `tally` field types as defined in `homework.capture` (the current content uses `repeat`, `checkbox` and `text`).

## Appendix C — Content file overview

Top-level keys of `course-content.json`:

```
schemaVersion, contentVersion, locale, title, sourceDoc,
characters[]   {id, name, trait, catchphrase, role}
sdg[]          {number, title, kidCaption, icon}      mentor reference only
ui{}           Vietnamese UI strings; {n} and {total} are placeholders;
               correctLines[], wrongLines[], cheers[], oops[] are lists to pick from at random
levels[]       {id, order, title, name, objectives[2–3], cards[], quiz[], form{}}
  cards[]      {id, order, title, body, bullets[]?, footer?}
  quiz[]       {id, order, prompt, options[3]{id, text, correct}, explanation, shuffleOptions}
  form{}       {title, intro?, questions[], note?}
    questions[] {id, prompt, hint?, parts[], allowDontKnow, note?}
      parts[]   one of the types in Appendix B, each with its own id and optional
                label, placeholder, required, optional
      context[]     {questionId, partId}: earlier answers shown above the question
      (on a part) optionsFrom {questionId, partId}: offer only the options chosen there
      (on a part) copyFrom {homeworkId, fieldId, groupId, toGroupId}: offer to copy homework rows
                    (supported; not used since .12)
homework.items[].showAnswer {questionId, partId}: show that answer on the item
homework.capture.*[].rowLabel   label of repeated rows, {n} = row number ("Bạn {n}")
submission[]  {part, section, questionIds[], homeworkIds[]?, note?}: the submission map (FR-M-16)
homework{}     {title, intro, items[]{id, order, text, showAnswer?}, capture{<item id>: [...]}, printable}
               (since .12: one item, H2 "Chơi thử với bạn")
zoom{}         informational only (agenda for the mentor); inApp: false
```

Sample card:

```json
{ "id": "L5C3", "order": 3, "title": "Tiền lời thật.",
  "body": "Tiền lời = tiền bán được − tiền làm. Làm 10 chiếc hết 80 nghìn, nên lời 120 − 80 = 40 nghìn. Nhưng tiệm còn mua giấy vẽ poster hết 10 nghìn. Vậy tiền lời thật là 40 − 10 = 30 nghìn. Nếu tiêu nhiều hơn tiền bán được, tiệm bị lỗ." }
```

Sample quiz question:

```json
{ "id": "L5Q1", "order": 1,
  "prompt": "Gấu bán một chiếc vòng 12 nghìn. Tiền làm là 8 nghìn. Tiệm lời bao nhiêu?",
  "options": [ { "id": "a", "text": "12 nghìn", "correct": false },
               { "id": "b", "text": "4 nghìn",  "correct": true  },
               { "id": "c", "text": "20 nghìn", "correct": false } ],
  "explanation": "12 − 8 = 4 nghìn. 12 nghìn là tiền bán được, nhưng phải trả 8 nghìn tiền len trước.",
  "shuffleOptions": true }
```

Sample form question with an item list and a choice (competitors):

```json
{ "id": "L3F3", "prompt": "Nếu không chơi trò của đội, các bạn sẽ chơi gì? Kể 3 thứ.", "allowDontKnow": true,
  "parts": [
    { "id": "list", "type": "item_list", "minRows": 3, "maxItemsPerGroup": 6,
      "groups": [ { "id": "alt", "label": "Thứ các bạn có thể chơi thay", "hint": "kể ít nhất 3 thứ" } ],
      "fields": [ { "id": "name", "type": "text", "label": "Tên" },
                  { "id": "good", "type": "text", "label": "Hay ở chỗ…" },
                  { "id": "bad",  "type": "text", "label": "Chưa hay ở chỗ…" } ] },
    { "id": "edge", "type": "multi_choice", "label": "Trò của đội hơn các thứ đó ở chỗ nào?",
      "min": 1, "allowAddOwn": true, "options": [ { "id": "a", "text": "Giá vừa túi tiền" }, "…" ] } ] }
```

Notes marked `note` on a question are instructions to the builder, not text for the child.

## Appendix D — UI strings

Provided in `ui{}` of the content file. The main ones:
- **Navigation:** Tiếp · Quay lại · Vào màn thôi! · Chơi tiếp nào! · Chơi lại.
- **Choices and forms:** Chưa biết · Khác · Nộp phiếu thôi! · Đã lưu · Đến lượt đội con · Thêm của con.
- **Sections:** Thẻ truyện · Câu đố.
- **Parent hints:** Bố mẹ đọc thẻ cho con nghe nhé · Con nói, bố mẹ gõ cũng được · Khi đội có bản nháp, giờ ra chơi rủ 3 bạn chơi thử nhé (`homeworkReminder`) · Mục tiêu (cho bố mẹ).
- **Titles:** Hú hú! Xong Màn {n}! · Ai tới chơi đây? · Nhập mã bí mật của con.
- **Validation:** Cộng lại phải đúng {total} · Chọn đúng {n} câu.
- **Feedback lists:**
  - `correctLines`: e.g. "Hú hú! Trúng phóc!"
  - `wrongLines`: e.g. "Suýt trúng! Nghe Drắc Nhí kể nè:"
  - `cheers`: e.g. "Trúng phóc!"
  - `oops`: e.g. "Ối!"

Strings the app adds itself, in the same register:
- **Map:** "Hôm nay mình chơi", "Mở rồi, vào thôi!", "Xong rồi!", "Cửa này còn khóa! Con xong Màn n là mở nha."
- **Quiz end:** "Xong câu đố! Thu kẹo nào!"
- **Profiles:** "Ối, sai mã rồi. Thử lại nhé!"
- **Loading:** "Đang thắp đèn bí ngô…"

## Appendix E — Glossary

| Term | Meaning here |
| --- | --- |
| Màn | A level of the course; one per day |
| Thẻ truyện | Story card; one idea, a few short sentences |
| Câu đố | Quiz question; 3 options, one correct, explanation |
| Đến lượt đội con | "Your team's turn": the per-level form about the children's own game |
| Chưa biết | "Don't know yet": the escape option on every form question |
| Chơi thử với bạn | The one optional homework task: 3 friends play the paper draft at school; the child ticks laughed / finished / wants to play again |
| Drắc Nhí | The mascot: a friendly baby Dracula who reacts to quiz answers (seasonal skin) |
| Mentor | The parent who runs the course and writes up the submission |
| SDG | UN Sustainable Development Goals; one is ticked on the submission by the mentor, not by the children |

## Appendix F — Submission map

`submission-map.md` (supplied) lists, for each section of the competition template, the question ids that feed it. In short:

| Template section | Question ids |
| --- | --- |
| Idea | L1F1, L2F4, L4F1, L3F1 |
| Problem or need | L1F2, L1F3, L1F4 |
| Why it will work | L2F1, L2F2, L2F3, L3F4a, L5F2, L6F2, H2 |
| Start-up capital and budget | L6F2, L6F3 (prices checked by parents) |
| Profit sharing (and use of money) | L6F4 |
| Customers and research | L3F1, L3F2, L2F1, H2 (optional) |
| Competitors (at least 3) | L3F3 |
| SWOT | L3F4, L2F2, L7F3 (+ Zoom) |
| Operational plan, organogram, rotation | L7F1, L7F2 (+ Zoom) |
| 4Ps | Product L1F1, L2F4, L4F1 · Price L4F2 · Place L4F3 · Promotion L4F4 |
| Financial plan | L6F1, L4F2, L5F1, L5F3 |
| Safety (teacher section) | L7F4, L2F3a |

From content .10 the same map is in the content file as the top-level `submission` list; FR-M-16 reads it from there, so a new template only needs a content upload.
