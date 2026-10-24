# Requirements: "Tiệm Vòng Tay Rừng Xanh" learning game

Request for proposal — version 1.0, October 25, 2026
Owner: Richard Dam (parent mentor of the team). Contact: [email / Zalo]
Content file supplied with this document: `content/course-content.json` (schema 1.0, content version 2026-10-25)

---

## 1. What we are asking for

A small web app, in Vietnamese, that lets four 8-year-old children work through a 7-level "mini course" on running a business, about 10 minutes per level, and that records what each child answers about their own business idea so their mentor can turn those answers into a competition submission.

Each level has three parts: a few short story cards that teach one concept each, a short quiz with immediate explanations, and a short form where the child applies the concept to the team's own idea. The app must also give the mentor a console to read all four children's answers side by side and export them.

We will send this document to more than one vendor. Please answer each numbered requirement (Must / Should / Could) with "included", "included as option (price)", or "not included", and quote a fixed price for the Must set.

## 2. Background

**The competition.** The children are in the School Enterprise Challenge, a global schools programme run by the UK charity Teach A Man To Fish. TOMATO Education runs the Vietnamese edition as "Cuộc thi Khởi nghiệp học đường 2026". Teams go through seven milestones over a school year: form a team, explore dreams, write a business idea, write a business plan, launch, run the business and report on it, celebrate. The business idea and plan are worth 40% of the score; the report on actually running the business is the rest.

**The team.** Four children aged 8 (grade 3) at an international school in Ho Chi Minh City. Their idea is a "Magic" board game for primary and secondary students, mainly for fun and to build friendships. The mentor is a parent (the owner of this document). Other parents help their own child at home.

**Rules that shape the product.**
- The work must be student-led. Adults may ask questions but must not write the answers. Judges mark work that looks adult-written as insufficient.
- The programme asks teams to minimise the use of AI. The app must therefore never generate, suggest or autocomplete the children's answers. It teaches concepts and records what the children decide.
- Evidence that the children decided matters. Timestamps, answer history and exports are part of the product, not an afterthought.

**Why an app.** Meetings do not work at this age; the children cannot concentrate long enough to cover the plan's topics (problem and SDG, feasibility, customers and competitors, SWOT, 4Ps, tasks and roles, start-up capital, revenue, costs and profit). Ten minutes a day at home, with a parent reading the cards aloud, does.

**Where the content comes from.** The course was written and reviewed by the mentor and three outside reviewers (a business educator, a teacher and a parent). It exists as a Vietnamese document and as the JSON file supplied with this RFP. The vendor builds the app; the client supplies and owns all content.

## 3. Goals and success criteria

1. A child can complete one level in about 10 minutes with a parent reading the cards aloud, on the parent's phone.
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

**In scope (MVP, "Must").** Player app for 7 levels with cards, quiz, forms; profiles and PINs; progress saved and resumable; homework sheet view and print; mentor console with progress, answers, compare view, exports; content loaded from the JSON file; hosting set up on the client's account; handover of source code and documentation.

**Should.** In-app capture of homework results; read-aloud audio for cards; stickers and small rewards; content preview mode; Zoom vote-sheet generator.

**Could.** Offline (PWA) play; multi-team UI; a second UI language; Google Sheet import for content.

**Out of scope.** Building or designing the children's physical board game; any AI or chat feature; the Zoom meeting itself; writing or translating the competition submission; accounts for the general public; native app-store releases (a PWA is fine); advertising, analytics for marketing, social features, leaderboards, in-app purchases.

## 6. The course content

Source of truth: `content/course-content.json`. The numbers below describe version 2026-10-25.

| Element | Count | Notes |
| --- | --- | --- |
| Levels (Màn) | 7 | One per day. Order: 1 what a business is; 2 feasibility; 3 customers and competitors; 4 selling (4Ps); 5 revenue, costs, profit; 6 start-up capital and profit sharing; 7 working as a team. |
| Objectives per level | 2 | For parents. Shown collapsed. |
| Concept cards | 28 (4 per level) | 2–4 sentences each. One card has a 4-item bullet list and a footer line. Key terms carry the English word in brackets. |
| Quiz questions | 27 (3–4 per level) | 3 options, exactly one correct, one explanation. Correct answer positions in the file: a 8, b 9, c 10. The app must shuffle option order on every play. |
| Form questions ("Đến lượt đội con") | 26 (3–4 per level) | 8 input types, see Appendix B. Every question has a "Chưa biết" (don't know) escape. |
| Homework items | 5 | One printable sheet handed out on day 1. Optional in-app capture (Should). |
| Characters | 4 | Sóc Hạt Dẻ (squirrel, maker), Gấu Mật (bear, keeps the money, loves honey), Thỏ Bông (rabbit, seller), Cú Mèo (owl, "what if…?"). |
| SDG icons | 17 | Each with its official Vietnamese title and a one-line caption for children, supplied in the file. |
| UI strings | ~25 | Vietnamese, supplied in the file; the vendor may propose additions. |

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
| FR-P-09 | A persistent, small "Bài về nhà" button opens the homework sheet (FR-P-26). It is highlighted on day 1 and after level 3. | M |

### 7.3 Level intro and cards

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-10 | Level intro: level title, a character illustration, a "Bắt đầu" button, and the two parent-facing objectives behind a collapsed "Mục tiêu (cho bố mẹ)" disclosure. | M |
| FR-P-11 | Cards are shown one per screen: title, body, optional bullet list, optional footer line. Large type (body 18 px or larger on phones), generous line height, Next and Back. A progress indicator shows "Thẻ 2/4". | M |
| FR-P-12 | A one-line hint at the first card of each level says a parent should read the cards aloud. It can be dismissed per device. | M |
| FR-P-13 | English terms in brackets, e.g. "khách hàng (customer)", render as-is; the vendor may style them lighter. | M |
| FR-P-14 | Read-aloud audio for every card: either recorded Vietnamese voice (preferred) or on-device Vietnamese text-to-speech. Play/pause per card. Content changes must not require re-recording of unchanged cards. | S |

### 7.4 Quiz

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-15 | One question per screen; the three options are shuffled on every play (seeded per attempt and stored, so the mentor can reconstruct what the child saw). Option labels A/B/C in the content file are identifiers only and must not be displayed as the fixed order. | M |
| FR-P-16 | Tapping an option locks the answer and shows feedback immediately: a short celebration for correct, a gentle "Chưa đúng. Xem này:" for wrong, followed in both cases by the explanation text. Then a "Tiếp" button. The child cannot change the answer after tapping; there is no penalty for a wrong answer. | M |
| FR-P-17 | The first attempt at each question is recorded immutably (question id, option shown positions, chosen option, correct or not, timestamp). Replays are recorded as further attempts and never overwrite the first. | M |
| FR-P-18 | A character reacts to right and wrong answers (at least two expressions per character). Sound effects are optional and must be mutable; sound off by default. | S |
| FR-P-19 | Quiz end screen: "Xong câu đố!" with the number correct on the first try shown only as encouragement (e.g. 3 stars out of 4), never as a pass/fail. | M |

### 7.5 Forms ("Đến lượt đội con")

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-P-20 | One question per screen, with the level's intro line where the content provides one, and the hint text in smaller type. Multi-part questions (e.g. a choice plus "Vì sao?") show their parts on one screen in order. | M |
| FR-P-21 | The eight input types in Appendix B are implemented with the validation rules given there. Every question has a "Chưa biết" option that satisfies the question; it is always the last option and visually quieter. | M |
| FR-P-22 | Each answer is autosaved on change with a timestamp. A review screen at the end lists all answers of the level with an "Sửa" (edit) link per question, then "Nộp phiếu". After submission the child can still edit until the mentor locks the level; every edit is kept as a new version. | M |
| FR-P-23 | Where the content marks `note` about context (e.g. L5F2 shows the child's own price from L4F2 and cost from L5F1), the app shows those earlier answers above the input, read-only. | S |
| FR-P-24 | Text inputs accept the device's own Vietnamese keyboard and dictation; no custom keyboard. Maximum lengths from the content file are enforced softly (counter), not with a blocking error. | M |
| FR-P-25 | The app never prefills, suggests, ranks or autocompletes form answers, and never shows another child's answers to a child. | M |
| FR-P-26 | Homework sheet: a screen that renders the five items from the content file, plus a "In" (print or save as PDF) action producing an A4 sheet with tick boxes for items 2 and 3 and a price table for item 4. | M |
| FR-P-27 | In-app homework capture using the `capture` definitions in the content file (item list, repeat groups, checkboxes, tallies, text). Saved per profile like form answers. | S |
| FR-P-28 | Level complete screen: sticker, "Xong Màn n! Hẹn mai nhé.", and a homework reminder after levels 1 and 3. | M |

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

## 9. Content and data model

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-C-01 | All course content (levels, cards, quiz, forms, homework, characters, SDG list, UI strings) comes from the JSON file. No level, card, question or option is hard-coded. Adding level 8 is a content change only. | M |
| FR-C-02 | The vendor delivers a JSON schema (draft 2020-12 or equivalent) for the content file, matching Appendix C, and uses it for upload validation. The client may extend the schema with new question types in future; the design should make a new type a contained addition. | M |
| FR-C-03 | Content versions are immutable once an answer references them. | M |
| FR-C-04 | Answer records store: team, profile, content version, level id, question id, part id, value (typed), "Chưa biết" flag, created and updated timestamps, version number, device type. Quiz attempt records store: attempt number, displayed option order, chosen option, correct flag, timestamps. Section timing records store: profile, level, section, start, end. | M |
| FR-C-05 | Images: character art, stickers, level map and the 17 SDG icons live in an `assets/` folder referenced by path from the content file. SDG icons must be the official UN icons in Vietnamese; the vendor confirms the licence terms allow this non-commercial educational use and documents the source. | M |

## 10. Design and tone

| ID | Requirement | Priority |
| --- | --- | --- |
| DR-01 | Visual style: warm, simple, cartoon-like, bright but not noisy; think a picture book, not a casino. Mobile-first, portrait. | M |
| DR-02 | Four original character illustrations (squirrel, bear, rabbit, owl) consistent in style, each with at least three expressions: neutral, happy, thinking; and one "oops" for the bear. A level map or path. One sticker per level. The client owns the artwork. Licensed stock art is acceptable if the licence allows this use and is documented. | M |
| DR-03 | Tone of all system copy: friendly, short, plain Vietnamese for an 8-year-old; no exclamation overload; no English UI strings. Use the strings in the content file; propose additions in the same register. | M |
| DR-04 | Readability: body text at least 18 px on phones; line length at most about 40 Vietnamese syllables; tap targets at least 48 × 48 px; colour contrast at least 4.5:1 for text; no information carried by colour alone. Vietnamese diacritics must render correctly in the chosen fonts (test "ỡ ờ ở ẵ ậ ệ ự"). | M |
| DR-05 | Animations are short (under 600 ms) and skippable; nothing moves while the child is reading a card. | M |
| DR-06 | No dark patterns: no streaks, no countdowns, no "come back or lose", no notifications to children. | M |
| DR-07 | Design review: the vendor presents clickable screens for level 1 (profile picker, home, 2 cards, 1 quiz question with both feedback states, 2 form questions, level complete) before building the rest. | M |

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
3. MVP release: all Must requirements, deployed on the client's hosting, with content version 2026-10-25 loaded and four profiles created.
4. Source repository, README, content schema, test suite, design files, artwork, asset licence notes.
5. A 30-minute handover call and written answers to follow-up questions for 3 months (warranty, see section 14).

**Acceptance tests (the client will run these before accepting the MVP)**
1. On an iPhone and on an Android phone, pick a profile, enter the PIN, complete level 1 end to end in under 12 minutes with a parent reading the cards aloud.
2. Stop mid-quiz on the phone, open the same profile on a laptop, continue from the same question.
3. Answer a quiz question wrongly: see the explanation, continue, and find the first attempt recorded as wrong in the console; replay the level and confirm the first attempt is unchanged and the option order differs.
4. On L6F4, enter 60 and 30 and confirm the app blocks continuing until the total is 100; enter 50 and 50 and continue.
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

## 13. Timeline

What is fixed:
- Content version 2026-10-25 is ready now (supplied with this RFP).
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

- The client supplies all Vietnamese content, the SDG captions and any future levels, in the JSON format; the vendor may propose schema improvements.
- Character art is created by the vendor (or licensed) and owned by the client.
- Read-aloud audio, if recorded, is in a neutral Vietnamese voice; the client reviews one sample card before full recording.
- The competition deadline of November 3 is being confirmed with the organiser; it does not change the requirements.
- Hosting accounts will be created by the client before the build starts; the vendor tells us which services to create.

---

## Appendix A — Screen flow

```
Profile picker → PIN → Home (level map, homework button)
  → Level intro (objectives collapsed)
    → Card 1 … Card n (Next/Back, read-aloud)
    → Quiz Q1 … Qn (tap → feedback + explanation → Next)
    → Quiz end (stars) 
    → Form intro (if any) → Form Q1 … Qn (autosave) → Review → Submit
    → Level complete (sticker, homework reminder) → Home
Homework sheet (view, print, optional capture)
Mentor console: Login → Dashboard → Profiles | Levels | Quiz results | Form answers | Compare | Exports | Content | Settings
```

## Appendix B — Form question types and where they occur

| Type | Behaviour and validation | Used in |
| --- | --- | --- |
| `text` | Single text area; `maxLength` soft limit with counter; device keyboard and dictation. "Chưa biết" allowed. | L1F1, L1F2, L1F4b, L2F1b, L2F3a, L3F3 (3 fields), L3F4 (2), L4F1b, L4F2b, L6F1b, L6F3b, L7F2b, L7F3 (2) |
| `single_choice` | Large option tiles; exactly one; an option with `allowText: true` ("Khác") reveals a short text field. | L1F3, L2F1a, L2F3b, L3F1a, L3F1b, L4F1a, L7F2a |
| `multi_choice` | Tick tiles; `min` and optional `max` enforced with a clear message ("Chọn nhiều nhất 2"); `allowAddOwn` lets the child add their own option text (L7F1). | L2F2, L4F3, L4F4, L5F3, L6F3a (max 2), L7F1, L7F4 |
| `number` | Numeric keypad; integer; unit label shown ("nghìn đồng"); `min`/`max`. Negative allowed only where `min` is negative (L5F2). | L4F2a, L5F1, L5F2, L6F1a |
| `pick_n` | Tick exactly `n` options; options may carry `leading: true` with a `feedback` string shown once, gently, when ticked; the child may keep the choice. The chosen texts are reused on the homework sheet. | L3F2 |
| `sdg_picker` | Grid of 17 icons; tapping shows number, title and kid caption; one selection. | L1F4a |
| `item_list` | Grouped list; each row has the `fields` given (name, optional price); add/remove rows; `maxItemsPerGroup`. | L6F2 (3 groups) |
| `sum_split` | Numeric fields that must add up to `total`; running total shown; continue disabled until exact; a field with `allowText` has a short text beside it ("Ghi tên việc"). | L6F4 |

Homework capture (Should) adds `repeat`, `checkbox` and `tally` field types as defined in `homework.capture`.

## Appendix C — Content file overview

Top-level keys of `course-content.json`:

```
schemaVersion, contentVersion, locale, title, sourceDoc,
characters[]   {id, name, trait, catchphrase, role}
sdg[]          {number, title, kidCaption, icon}
ui{}           Vietnamese UI strings; {n} and {total} are placeholders
levels[]       {id, order, title, name, objectives[2], cards[], quiz[], form{}}
  cards[]      {id, order, title, body, bullets[]?, footer?}
  quiz[]       {id, order, prompt, options[3]{id, text, correct}, explanation, shuffleOptions}
  form{}       {title, intro?, questions[], note?}
    questions[] {id, prompt, hint?, parts[], allowDontKnow, note?}
      parts[]   one of the types in Appendix B, each with its own id and label
homework{}     {title, intro, items[5]{id, order, text}, capture{H1..H5}, printable}
zoom{}         informational only (agenda for the mentor); inApp: false
```

Sample card:

```json
{ "id": "L5C3", "order": 3, "title": "Lời gộp và lời ròng.",
  "body": "Tiền lời = doanh thu − chi phí. Làm 10 chiếc hết 80 nghìn, nên 120 − 80 = 40 nghìn: đó là lời gộp (gross profit). …" }
```

Sample quiz question:

```json
{ "id": "L5Q1", "order": 1,
  "prompt": "Gấu Mật bán một chiếc vòng 12 nghìn. Len, hạt và móc hết 8 nghìn. Tiệm lời bao nhiêu?",
  "options": [ { "id": "a", "text": "12 nghìn", "correct": false },
               { "id": "b", "text": "4 nghìn",  "correct": true  },
               { "id": "c", "text": "20 nghìn", "correct": false } ],
  "explanation": "Khoan đã Gấu ơi! 12 nghìn là tiền khách đưa, nhưng 8 nghìn phải dành trả tiền len rồi. …",
  "shuffleOptions": true }
```

Sample form question with two parts:

```json
{ "id": "L4F1", "prompt": "Đội bán gì? Vì sao?", "hint": "chọn + 1 câu", "allowDontKnow": true,
  "parts": [
    { "id": "a", "type": "single_choice",
      "options": [ { "id": "a", "text": "Bộ trò chơi để mang về" },
                   { "id": "b", "text": "Vé chơi tại chỗ" },
                   { "id": "c", "text": "Cả hai" } ] },
    { "id": "b", "type": "text", "label": "Vì sao?", "maxLength": 300 } ] }
```

Notes marked `note` on a question are instructions to the builder, not text for the child.

## Appendix D — UI strings

Provided in `ui{}` of the content file. The main ones: Tiếp · Quay lại · Bắt đầu · Chơi tiếp · Chơi lại · Đúng rồi! · Chưa đúng. Xem này: · Chưa biết · Khác · Nộp phiếu · Đã lưu · Đến lượt đội con · Thẻ khái niệm · Câu đố · Bố mẹ đọc thẻ cho con nghe nhé · Con nói, bố mẹ gõ cũng được · Xong Màn {n}! Hẹn mai nhé. · Nhớ Bài về nhà nhé · Mục tiêu (cho bố mẹ) · Mai mở · Con là ai? · Nhập mã của con · Cộng lại phải đúng {total} · Chọn đúng {n} câu · Thêm của con.

## Appendix E — Glossary

| Term | Meaning here |
| --- | --- |
| Màn | A level of the course; one per day |
| Thẻ khái niệm | Concept card; one idea, 2–4 sentences |
| Câu đố | Quiz question; 3 options, one correct, explanation |
| Đến lượt đội con | "Your team's turn": the per-level form about the children's own game |
| Chưa biết | "Don't know yet": the escape option on every form question |
| Bài về nhà | The homework sheet: paper prototype, playtest, recess tick sheet, prices, what to change |
| Mentor | The parent who runs the course and writes up the submission |
| SDG | UN Sustainable Development Goals, 17 icons the children pick one from |
