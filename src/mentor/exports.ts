// Exports (FR-M-08): per-child PDF, team CSV and JSON. PINs never leave the server (they are not
// even in TeamData), so no export can contain them.
import type { AnswerVersion, TeamData } from '../api/types';
import type { CourseContent } from '../content/types';
import { HOMEWORK_LEVEL_ID, byOrder } from '../content/types';
import { makeT } from '../content/strings';
import { formatPart, withColon } from '../domain/answers';
import { answerHistory, asPartAnswer, fmtTime, latest, questionText } from './derive';

export function download(filename: string, data: Blob | string, type = 'text/plain;charset=utf-8') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

// ---------------------------------------------------------------- CSV

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  // BOM so Excel opens the Vietnamese text as UTF-8.
  return '﻿' + [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
}

// Every version of every answer, one row each.
const ANSWER_COLUMNS = ['profile', 'profile_id', 'level_id', 'question_id', 'part_id', 'question', 'part_label', 'answer_text', 'value_json', 'dont_know', 'version', 'created_at', 'updated_at', 'device_type', 'content_version_id'];

export function teamCsvFiles(d: TeamData, contents: Map<string, CourseContent>, active: CourseContent): Record<string, string> {
  const t = makeT(active.ui);
  const name = (id: string) => d.profiles.find((p) => p.id === id)?.displayName ?? '';
  const answerRows = d.answers.map((a) => {
    const { question, part } = questionText(contents, active, a);
    return {
      profile: name(a.profileId),
      profile_id: a.profileId,
      level_id: a.levelId,
      question_id: a.questionId,
      part_id: a.partId,
      question: question?.prompt ?? '',
      part_label: part?.label ?? '',
      answer_text: part ? formatPart(part, asPartAnswer(a), contents.get(a.contentVersionId) ?? active, t) : '',
      value_json: a.value,
      dont_know: a.dontKnow,
      version: a.version,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
      device_type: a.deviceType,
      content_version_id: a.contentVersionId,
    };
  });
  return {
    'profiles.csv': toCsv(
      d.profiles.map((p) => ({ id: p.id, display_name: p.displayName, avatar: p.avatar, archived_at: p.archivedAt, created_at: p.createdAt })),
      ['id', 'display_name', 'avatar', 'archived_at', 'created_at'],
    ),
    'answers.csv': toCsv(answerRows, ANSWER_COLUMNS),
    'quiz_attempts.csv': toCsv(
      d.attempts.map((a) => ({
        profile: name(a.profileId),
        profile_id: a.profileId,
        level_id: a.levelId,
        question_id: a.questionId,
        attempt_no: a.attemptNo,
        displayed_order: a.displayedOrder.join(' '),
        chosen_option_id: a.chosenOptionId,
        correct: a.correct,
        seed: a.seed,
        shown_at: a.shownAt,
        answered_at: a.answeredAt,
        device_type: a.deviceType,
        content_version_id: a.contentVersionId,
      })),
      ['profile', 'profile_id', 'level_id', 'question_id', 'attempt_no', 'displayed_order', 'chosen_option_id', 'correct', 'seed', 'shown_at', 'answered_at', 'device_type', 'content_version_id'],
    ),
    'section_timings.csv': toCsv(
      d.timings.map((x) => ({ profile: name(x.profileId), profile_id: x.profileId, level_id: x.levelId, section: x.section, started_at: x.startedAt, ended_at: x.endedAt })),
      ['profile', 'profile_id', 'level_id', 'section', 'started_at', 'ended_at'],
    ),
    'level_states.csv': toCsv(
      d.levelStates.map((s) => ({ profile: name(s.profileId), profile_id: s.profileId, level_id: s.levelId, override: s.override, form_locked: s.formLocked, submitted_at: s.submittedAt, completed_at: s.completedAt, reset_count: s.resetCount })),
      ['profile', 'profile_id', 'level_id', 'override', 'form_locked', 'submitted_at', 'completed_at', 'reset_count'],
    ),
  };
}

export function exportCsv(d: TeamData, contents: Map<string, CourseContent>, active: CourseContent) {
  for (const [file, text] of Object.entries(teamCsvFiles(d, contents, active))) download(`${stamp()}-${file}`, text, 'text/csv;charset=utf-8');
}

export function teamJson(d: TeamData): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...d }, null, 2);
}

export function exportJson(d: TeamData, filename = `${stamp()}-team-data.json`) {
  download(filename, teamJson(d), 'application/json');
}

export function profileJson(d: TeamData, profileId: string): string {
  const only = <T extends { profileId: string }>(xs: T[]) => xs.filter((x) => x.profileId === profileId);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: d.profiles.find((p) => p.id === profileId),
      levelStates: only(d.levelStates),
      attempts: only(d.attempts),
      answers: only(d.answers),
      timings: only(d.timings),
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------- PDF

type PdfNode = Record<string, unknown> | string;

export async function childPdf(d: TeamData, profileId: string, contents: Map<string, CourseContent>, active: CourseContent): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pm = pdfMake as unknown as {
    addVirtualFileSystem: (v: unknown) => void;
    createPdf: (doc: unknown) => { getBlob: () => Promise<Blob> };
  };
  pm.addVirtualFileSystem(vfs);

  const t = makeT(active.ui);
  const profile = d.profiles.find((p) => p.id === profileId)!;
  const history = answerHistory(d.answers);
  const content: PdfNode[] = [
    { text: active.title, style: 'muted' },
    { text: `Phiếu trả lời của ${profile.displayName}`, style: 'h1' },
    { text: `Xuất lúc ${fmtTime(new Date().toISOString())} · nội dung phiên bản ${active.contentVersion}`, style: 'muted', margin: [0, 0, 0, 12] },
  ];

  const answerBlock = (a: AnswerVersion | undefined, partLabel: string | undefined, text: string, edits: number): PdfNode[] => {
    if (!a) return [{ text: [partLabel ? { text: `${withColon(partLabel)} `, bold: true } : '', { text: '(chưa trả lời)', italics: true, color: '#777' }], margin: [10, 0, 0, 4] }];
    return [
      { text: [partLabel ? { text: `${withColon(partLabel)} `, bold: true } : '', text], margin: [10, 0, 0, 2] },
      {
        text: `Trả lời lần đầu ${fmtTime(a.createdAt)} · cập nhật ${fmtTime(a.updatedAt)}${edits ? ` · sửa ${edits} lần` : ''}`,
        style: 'stamp',
        margin: [10, 0, 0, 6],
      },
    ];
  };

  for (const level of byOrder(active.levels)) {
    content.push({ text: level.title, style: 'h2' });
    level.form.questions.forEach((q, i) => {
      content.push({ text: `${i + 1}. ${q.prompt}`, style: 'q' });
      for (const part of q.parts) {
        const a = latest(history, profileId, q.id, part.id);
        const c = (a && contents.get(a.contentVersionId)) || active;
        const versions = history.get(`${profileId}/${q.id}/${part.id}`)?.length ?? 0;
        content.push(...answerBlock(a, part.label, formatPart(part, asPartAnswer(a), c, t), Math.max(versions - 1, 0)));
      }
    });
  }

  const hwAnswers = d.answers.filter((a) => a.profileId === profileId && a.levelId === HOMEWORK_LEVEL_ID);
  if (hwAnswers.length) {
    content.push({ text: active.homework.title, style: 'h2', pageBreak: 'before' });
    for (const item of byOrder(active.homework.items)) {
      const parts = active.homework.capture?.[item.id] ?? [];
      const any = parts.some((p) => latest(history, profileId, item.id, p.id));
      if (!any) continue;
      content.push({ text: `${item.order}. ${item.text}`, style: 'q' });
      for (const part of parts) {
        const a = latest(history, profileId, item.id, part.id);
        const versions = history.get(`${profileId}/${item.id}/${part.id}`)?.length ?? 0;
        content.push(...answerBlock(a, part.label, formatPart(part, asPartAnswer(a), active, t), Math.max(versions - 1, 0)));
      }
    }
  }

  const doc = {
    info: { title: `${profile.displayName} – ${active.title}` },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25 },
    footer: (page: number, pages: number) => ({ text: `${profile.displayName} · ${page}/${pages}`, alignment: 'center', fontSize: 8, color: '#777' }),
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 2, 0, 2] },
      h2: { fontSize: 14, bold: true, margin: [0, 12, 0, 6], color: '#23603c' },
      q: { bold: true, margin: [0, 6, 0, 3] },
      stamp: { fontSize: 8, color: '#666' },
      muted: { fontSize: 9, color: '#666' },
    },
    content,
  };
  return pm.createPdf(doc).getBlob();
}
