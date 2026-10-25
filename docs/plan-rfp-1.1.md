# Plan: changes for RFP v1.1 and content 2026-10-25.9

Inputs: `game-requirements.md` v1.1, `course-content.json` 2026-10-25.9 (currently in the repo root,
not yet in `content/`). Current build: commit `0d0867b`, content 2026-10-25.3.

## Where we stand

The new content file **fails our validator with 7 errors**, all about things the schema does not know
yet: `ui.correctLines / wrongLines / cheers / oops` are lists (the schema allows only strings),
`placeholder` on text parts, `minRows` on item lists, `optional` on a number part. Nothing in the
new file contradicts the app's model; it needs extensions, not a redesign.

Content facts that drive the work:
- 28 quiz (4 per level), 27 form questions, 7 part types in use; `sdg_picker` no longer used.
- Level 1 now asks the problem first (L1F2, L1F3, L1F4, then L1F1), and L1F4 is a text "Vì sao…".
- L1F1 has a required text plus a players choice; L2F4, L5F3b, L6F4b, L7F2c are new parts.
- L3F3 is now an item list (name / "Hay ở chỗ…" / "Chưa hay ở chỗ…", `minRows: 3`) plus a
  multi choice with "Thêm của con".
- **Again missing:** the machine-readable links this app uses — `context` (L5F2), `optionsFrom`
  (L7F2a), homework `showAnswer` (H2) and `rowLabel`. FR-P-23 now asks for two more links:
  L1F4 shows the L1F3 choice, and L6F2 offers copying the material prices from homework H4.
- `submission-map.md` (Appendix F, used by FR-M-16) is **not in the repo**.

## Work, in order

Estimates are for me working in this repo; they assume the open questions below are answered with
the recommended option.

### 1. Load content .9 (Must) — about 0.5 day

- Move `course-content.json` into `content/`, bump nothing (it is the client's version).
- Schema + types + generated validator: `ui` values may be a string or a list of strings;
  `placeholder`, `required`, `optional` on every part; `minRows` on item lists; free text `fields`
  on item lists; `copyFrom` (new, see Q1); top-level `submission` map (new, see Q2).
- Re-add the link fields (Q1): L1F4 `context` ← L1F3, L5F2 `context`, L7F2a `optionsFrom`,
  L6F2 `copyFrom` ← H4 materials, H2 `showAnswer`, H2/H3 `rowLabel`.
- Strings: `t()` picks at random from list values (`pick('correctLines')`), keeps fallbacks.

### 2. Form rules from Appendix B (Must) — about 1 day

This is the biggest behaviour change: today every part must be answered or "Chưa biết".

| Rule (Appendix B) | Change |
| --- | --- |
| Text parts not required unless `required: true` | `checkPart` treats an empty optional text as complete; `required` text must be filled unless the question is "Chưa biết" |
| Choice parts must be filled unless `optional` | Same as today, plus `optional` on number/choice parts (L5F3b) |
| "Vì sao" / "Lý do" nudge | An empty text part whose label starts with "Vì sao" or "Lý do": the first tap on Tiếp shows one gentle nudge, the second tap goes through (acceptance test 4) |
| `placeholder` | Shown in the empty field (sentence starter) instead of "Viết vào đây…" |
| Dictation tip under the first text field of each question (FR-P-24) | Move today's top banner to sit under the first text box, still dismissible |
| `allowAddOwn` as removable chips | Text field + "Thêm" button creating chips with ✕ (today: a list of inputs) |
| Item lists: `minRows` shown at start; extra text fields; numbered cards "Thứ 1"; rows stored without gaps | Rows with extra fields render as numbered cards; empty rows are dropped on save, review and export (acceptance test 17) |
| Number: "+/− toggle" for negatives | Keep today's labelled toggle; check wording against "+/−" |

Tests: new unit cases per rule; e2e acceptance 4, 16, 17, 18 rewritten/added.

### 3. Links between answers (FR-P-23, Should) — about 0.5 day

- L1F4: "Ở câu trước con chọn: …" from L1F3 (generic `context`; new label string).
- L6F2: "Chép giá từ Bài về nhà" copies H4 material rows (name, price) into the list; only fills
  empty rows, never overwrites, and is the child's own earlier data, so FR-P-25 still holds.
- L7F2a: only tasks ticked or added in L7F1, while L7F2c keeps all four options (acceptance 19).

### 4. Copy, intro and rewards (Must) — about 1 day

- App strings to the funnier register in Appendix D: map "Hôm nay mình chơi", "Mở rồi, vào thôi!",
  "Xong rồi!", "Cửa này còn khóa! Con xong Màn n là mở nha."; wrong PIN "Ối, sai mã rồi. Thử lại
  nhé!"; loading "Đang thắp đèn bí ngô…"; quiz end "Xong câu đố! Thu kẹo nào!". Parent notes stay plain.
- FR-P-10 intro chips: cards · quiz · form · "khoảng N phút" (estimate from counts, overridable
  with an optional `level.minutes`).
- FR-P-16: feedback heading picked at random from `correctLines` / `wrongLines`; chosen option
  bounces (right) or wobbles (wrong), under 600 ms.
- FR-P-19: candies instead of stars — one filled candy per first-try right, empty wrapper otherwise;
  keep the kind message line.
- FR-P-28: done screen shows `ui.levelDone`, the sticker and all four characters cheering.

### 5. Look: light theme, mascot, Halloween skin (DR-01, DR-02, DR-05, DR-08) — about 2 days

Must part (light theme):
- `<meta name="color-scheme" content="light only">` and `color-scheme: only light`, so Android's
  auto-dark and iOS dark mode do not invert the app; all colours stay in the CSS tokens.
- Audit animations: nothing moves on a card screen; everything off under reduced motion.

Should part (skin and mascot):
- Theme tokens per skin: `data-skin="plain" | "halloween"` on `<html>`; Halloween = cream, lilac,
  pumpkin, with a faint star/moon/bat background pattern (SVG, very low contrast so text stays ≥ 4.5:1).
- Art (SVG, drawn in code like today, overridable by files): Drắc Nhí (neutral, happy, oops);
  costumes as overlays on the four animals (witch hat, pumpkin cap, bat bow, wizard hat); candy
  filled/empty; glowing pumpkin for today's level on the map; small ghost riding the progress bar.
- FR-P-18 pop-up: mascot jumps in with a word from `ui.cheers` and sweets and bats (right), or
  wobbles with `ui.oops` and two bats (wrong). At most 2 s, `pointer-events: none` (never blocks a
  tap), never covers the explanation after it ends; not shown at all with reduced motion
  (acceptance 20). In the feedback box: mascot happy / oops. No sound.
- Skin switch for the mentor (DR-08): a team setting (new `teams.settings` jsonb, read by the
  public content call, changed in Cài đặt). With the skin off: plain light theme, no costumes,
  stars-or-candies follow the plain theme (candies stay, they are content-neutral).

### 6. Mentor console (Should) — about 1.5 days

- **FR-M-15 trial-run reset:** export first (as for team deletion), then delete answers, attempts
  and timings and clear level progress (completion, pointers), keeping profiles, PINs, mentor
  locks/unlocks and settings. To stop old devices re-uploading: a `teams.data_epoch` counter;
  sessions and every queued write carry the epoch; the server refuses writes from an older epoch,
  and the client drops them and reloads state. One migration + SQL function + UI.
- **FR-M-16 submission view:** sections from the submission map (Q2), each listing the questions
  that feed it and all four children's latest answers, printable; the SDG reference list (titles
  and kid captions) shown next to the "Problem or need" section, since the mentor now picks the SDG.

### 7. Tests, docs, handover — about 0.5 day

- Unit: schema with lists/placeholder/minRows/optional; every new form rule; random pick; candies.
- E2E: rewrite tests 1, 4, 11 for the new content; add 16–20; run on the separate test stack so the
  dev data stays.
- README: new fields, skin switch, reset, submission map; update `docs/playtest-2026-10-25.md`
  findings that the new content resolves (e.g. S1 hints, S2, S7).

**Total: about 7 working days** — about 4.5 for the Must items (1, 2, 4, light theme, tests) and
about 3 for the Should items (3, skin and mascot, 6). If the skin must be visible before
mid-November (section 15), doing 1 → 2 → 4 → 5 first keeps it ahead of the console work.

## Open questions (my recommendation first)

1. **Link fields in the content file.** The new content again dropped `context`, `optionsFrom`,
   `showAnswer`, `rowLabel`, and FR-P-23 adds two links (L1F4 ← L1F3, L6F2 ← H4). Recommended: keep
   them as content fields (plus a new `copyFrom`), I merge them into .9, and the mentor's master
   file carries them from now on. Alternative: hard-code them by question id from the notes,
   which breaks FR-C-01 and silently stops working when ids change.
2. **Submission map.** `submission-map.md` is not in the repo. Please add it. Recommended: store the
   map in the content file as an optional top-level `submission` list (section title → question
   ids), so it is versioned and uploaded with the content, as Appendix F asks ("not in code").
3. **Optional text parts.** Under Appendix B, a question with one plain text part (L1F2, L1F4,
   L3F4, L7F3) can be passed empty with no nudge and no "Chưa biết", so it records nothing.
   Recommended: give every empty text part the one-time gentle nudge (not only "Vì sao"/"Lý do"),
   second tap goes through. Alternative: follow Appendix B literally.
4. **Skin default.** Recommended: Halloween on by default until 15 November, then the mentor
   switches it off (or I add an end date to the setting).
5. **Trial-run reset scope.** Recommended: keep the mentor's per-level locks/unlocks and form locks,
   clear only the children's progress and data. Alternative: reset levels to the plain order too.
