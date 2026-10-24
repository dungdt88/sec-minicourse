// Pure computations over TeamData for the console views and exports (tested in tests/derive.test.ts).
import type { AnswerVersion, Profile, QuizAttempt, Section, TeamData } from '../api/types';
import type { CourseContent, FormQuestion, Level, Part } from '../content/types';
import { HOMEWORK_LEVEL_ID, byOrder } from '../content/types';
import { compareKey, formatPart, isComparable, type PartAnswer } from '../domain/answers';
import type { Translate } from '../content/strings';

export const activeProfiles = (d: TeamData): Profile[] =>
  d.profiles.filter((p) => !p.archivedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const key3 = (profileId: string, questionId: string, partId: string) => `${profileId}/${questionId}/${partId}`;

/** All versions of each (profile, question, part), oldest first. */
export function answerHistory(answers: AnswerVersion[]): Map<string, AnswerVersion[]> {
  const map = new Map<string, AnswerVersion[]>();
  for (const a of answers) {
    const k = key3(a.profileId, a.questionId, a.partId);
    map.set(k, [...(map.get(k) ?? []), a]);
  }
  for (const list of map.values()) list.sort((a, b) => a.version - b.version);
  return map;
}

export function latest(history: Map<string, AnswerVersion[]>, profileId: string, questionId: string, partId: string): AnswerVersion | undefined {
  const list = history.get(key3(profileId, questionId, partId));
  return list?.[list.length - 1];
}

export const asPartAnswer = (a: AnswerVersion | undefined): PartAnswer | undefined =>
  a ? { value: a.value, dontKnow: a.dontKnow } : undefined;

/** Number of edits after the first answer, across the parts of a question. */
export function editCount(history: Map<string, AnswerVersion[]>, profileId: string, q: FormQuestion | { id: string; parts: Part[] }): number {
  return q.parts.reduce((n, p) => n + Math.max((history.get(key3(profileId, q.id, p.id))?.length ?? 0) - 1, 0), 0);
}

/** Milliseconds per profile → level → section, from closed timing rows. Open rows are ignored. */
export function timeSpent(d: TeamData): Map<string, Map<string, Record<Section, number>>> {
  const out = new Map<string, Map<string, Record<Section, number>>>();
  for (const t of d.timings) {
    if (!t.endedAt) continue;
    const ms = Math.max(0, Date.parse(t.endedAt) - Date.parse(t.startedAt));
    // A section left open for hours (tab forgotten) says nothing about effort; cap each sitting.
    const capped = Math.min(ms, 45 * 60_000);
    const byLevel = out.get(t.profileId) ?? new Map<string, Record<Section, number>>();
    const rec = byLevel.get(t.levelId) ?? { cards: 0, quiz: 0, form: 0 };
    rec[t.section] += capped;
    byLevel.set(t.levelId, rec);
    out.set(t.profileId, byLevel);
  }
  return out;
}

export function minutes(ms: number): string {
  if (!ms) return '–';
  const m = Math.round(ms / 60_000);
  return m < 1 ? '<1′' : `${m}′`;
}

export function lastActivity(d: TeamData, profileId: string): string | null {
  const times = [
    ...d.answers.filter((a) => a.profileId === profileId).map((a) => a.updatedAt),
    ...d.attempts.filter((a) => a.profileId === profileId).map((a) => a.answeredAt),
    ...d.timings.filter((t) => t.profileId === profileId).map((t) => t.endedAt ?? t.startedAt),
  ];
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
}

export function firstAttempt(attempts: QuizAttempt[], profileId: string, questionId: string): QuizAttempt | undefined {
  return attempts
    .filter((a) => a.profileId === profileId && a.questionId === questionId)
    .sort((a, b) => a.attemptNo - b.attemptNo)[0];
}

export interface CompareRow {
  level: Level;
  question: FormQuestion;
  part: Part;
  /** Latest answer per profile id. */
  answers: Map<string, AnswerVersion | undefined>;
  /** Choice/number parts where the answered children do not all agree (FR-M-07). */
  flagged: boolean;
}

export function compareRows(content: CourseContent, d: TeamData): CompareRow[] {
  const history = answerHistory(d.answers);
  const profiles = activeProfiles(d);
  const rows: CompareRow[] = [];
  for (const level of byOrder(content.levels)) {
    for (const question of level.form.questions) {
      for (const part of question.parts) {
        const answers = new Map(profiles.map((p) => [p.id, latest(history, p.id, question.id, part.id)]));
        let flagged = false;
        if (isComparable(part)) {
          const keys = new Set(
            [...answers.values()].map((a) => compareKey(part, asPartAnswer(a))).filter((k): k is string => k != null),
          );
          flagged = keys.size > 1;
        }
        rows.push({ level, question, part, answers, flagged });
      }
    }
  }
  return rows;
}

/** Tally for the Zoom sheet: each option with the names of the children who chose it. */
export function voteLines(row: CompareRow, profiles: Profile[], content: CourseContent, t: Translate): { label: string; who: string[] }[] {
  const part = row.part;
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.displayName ?? '?';
  if ('options' in part) {
    const lines = part.options.map((o) => ({
      label: o.text,
      who: [...row.answers.entries()]
        .filter(([, a]) => {
          if (!a || a.dontKnow || a.value == null) return false;
          const v = a.value as { optionId?: string; optionIds?: string[] };
          return v.optionId === o.id || v.optionIds?.includes(o.id);
        })
        .map(([id]) => nameOf(id)),
    }));
    const own = [...row.answers.entries()].flatMap(([id, a]) =>
      ((a?.value as { own?: string[] } | null)?.own ?? []).filter((s) => s.trim()).map((s) => ({ label: s, who: [nameOf(id)] })),
    );
    const dk = [...row.answers.entries()].filter(([, a]) => a?.dontKnow).map(([id]) => nameOf(id));
    return [...lines, ...own, ...(dk.length ? [{ label: t('dontKnow'), who: dk }] : [])];
  }
  // Numbers, SDG, splits: one line per distinct answer.
  const groups = new Map<string, string[]>();
  for (const [id, a] of row.answers) {
    if (!a) continue;
    const label = formatPart(part, asPartAnswer(a), content, t);
    groups.set(label, [...(groups.get(label) ?? []), nameOf(id)]);
  }
  return [...groups.entries()].map(([label, who]) => ({ label, who }));
}

/** Question text as the child saw it: from the content version the answer was given under. */
export function questionText(contents: Map<string, CourseContent>, fallback: CourseContent, a: AnswerVersion): { question?: FormQuestion; part?: Part } {
  const c = contents.get(a.contentVersionId) ?? fallback;
  if (a.levelId === HOMEWORK_LEVEL_ID) {
    const part = c.homework.capture?.[a.questionId]?.find((p) => p.id === a.partId);
    const item = c.homework.items.find((i) => i.id === a.questionId);
    return { question: item ? { id: item.id, prompt: item.text, parts: part ? [part] : [], allowDontKnow: false } : undefined, part };
  }
  for (const l of c.levels) {
    const question = l.form.questions.find((q) => q.id === a.questionId);
    if (question) return { question, part: question.parts.find((p) => p.id === a.partId) };
  }
  return {};
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
