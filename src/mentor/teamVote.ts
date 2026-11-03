// "Chia tiền lời & Đội mình" in the console: each child's answers, the tally of the vote questions
// and the plain-text copy for the milestone write-up (tested in tests/team-vote.test.ts).
import type { AnswerVersion, Profile, TeamData } from '../api/types';
import type { FormQuestion } from '../content/types';
import {
  TEAM_VOTE_LEVEL_ID,
  TEAM_VOTE_PART,
  TEAM_VOTE_QUESTIONS,
  TEAM_VOTE_SECTIONS,
  TEAM_VOTE_TALLIED,
  TEAM_VOTE_TITLE,
  teamVoteText,
} from '../content/teamVote';
import { activeProfiles, answerHistory, fmtTime, latest } from './derive';

export interface TeamVoteChild {
  profile: Profile;
  /** Latest answer text per question id; null = not answered. */
  answers: Map<string, string | null>;
  answered: number;
  /** First "Gửi"; null = not submitted yet. */
  submittedAt: string | null;
  /** Answers changed after the first "Gửi" (the child may still edit). */
  editedAfter: boolean;
}

export function teamVoteChildren(d: TeamData): TeamVoteChild[] {
  const history = answerHistory(d.answers.filter((a) => a.levelId === TEAM_VOTE_LEVEL_ID));
  return activeProfiles(d).map((profile) => {
    const rows = new Map<string, AnswerVersion | undefined>(TEAM_VOTE_QUESTIONS.map((q) => [q.id, latest(history, profile.id, q.id, TEAM_VOTE_PART)]));
    const answers = new Map(TEAM_VOTE_QUESTIONS.map((q) => [q.id, teamVoteText(q, rows.get(q.id))]));
    const submittedAt = d.levelStates.find((s) => s.profileId === profile.id && s.levelId === TEAM_VOTE_LEVEL_ID)?.submittedAt ?? null;
    const editedAfter = !!submittedAt && [...rows.values()].some((a) => a && a.updatedAt > submittedAt);
    return { profile, answers, answered: [...answers.values()].filter((v) => v != null).length, submittedAt, editedAfter };
  });
}

export interface TallyLine {
  label: string;
  who: string[];
  /** A child's own idea under "Ý khác của con" (label = the idea, word for word). */
  own?: boolean;
}

/** One line per option in order, each child's own idea on its own line, then who has not answered. */
export function teamVoteTally(q: FormQuestion, children: TeamVoteChild[]): { lines: TallyLine[]; unanswered: string[] } {
  const part = q.parts[0];
  const options = part.type === 'single_choice' ? part.options : [];
  const lines: TallyLine[] = [];
  for (const o of options) {
    const chose = children.filter((c) => {
      const text = c.answers.get(q.id);
      return text != null && (o.allowText ? text.startsWith(`${o.text} `) : text === o.text);
    });
    lines.push({ label: o.allowText ? o.text.replace(/:$/, '') : o.text, who: chose.map((c) => c.profile.displayName) });
    if (o.allowText)
      for (const c of chose) lines.push({ label: c.answers.get(q.id)!.slice(o.text.length + 1), who: [c.profile.displayName], own: true });
  }
  return { lines, unanswered: children.filter((c) => c.answers.get(q.id) == null).map((c) => c.profile.displayName) };
}

const indent = (text: string, pad: string) => text.replace(/\r?\n/g, `\n${pad}`);

/** Plain text for the milestone write-up: status, the tally of questions 1–4, then every answer word for word. */
export function teamVoteCopyText(children: TeamVoteChild[]): string {
  const sent = children.filter((c) => c.submittedAt).map((c) => c.profile.displayName);
  const notSent = children.filter((c) => !c.submittedAt).map((c) => c.profile.displayName);
  const out: string[] = [TEAM_VOTE_TITLE.toUpperCase(), `Đã gửi: ${sent.join(', ') || '–'}`, `Chưa gửi: ${notSent.join(', ') || '–'}`, ''];

  out.push('KẾT QUẢ BỎ PHIẾU (câu 1–4)');
  TEAM_VOTE_TALLIED.forEach((q, i) => {
    const { lines, unanswered } = teamVoteTally(q, children);
    out.push(`${i + 1}. ${q.prompt}`);
    for (const l of lines) {
      if (l.own) out.push(`     “${indent(l.label, '      ')}” (${l.who.join(', ')})`);
      else out.push(`   - ${l.label}: ${l.who.length}${l.who.length ? ` (${l.who.join(', ')})` : ''}`);
    }
    if (unanswered.length) out.push(`   - Chưa trả lời: ${unanswered.length} (${unanswered.join(', ')})`);
  });

  let n = 0;
  for (const section of TEAM_VOTE_SECTIONS) {
    out.push('', section.title.toUpperCase());
    for (const q of section.questions) {
      n += 1;
      out.push(`${n}. ${q.prompt}`);
      for (const c of children) {
        const text = c.answers.get(q.id);
        const head = `   ${c.profile.displayName}: `;
        out.push(head + (text == null ? '(chưa trả lời)' : indent(text, ' '.repeat(head.length))));
      }
    }
  }

  out.push('', 'TRẠNG THÁI');
  for (const c of children)
    out.push(`   ${c.profile.displayName}: ${c.submittedAt ? `đã gửi ${fmtTime(c.submittedAt)}${c.editedAfter ? ', có sửa sau khi gửi' : ''}` : 'chưa gửi'} · ${c.answered}/${TEAM_VOTE_QUESTIONS.length} câu`);
  return out.join('\n');
}
