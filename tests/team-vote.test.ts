// "Chia tiền lời & Đội mình": the question text is the product owner's, word for word; the console
// tallies the vote and copies every answer verbatim with the children's names.
import { describe, expect, it } from 'vitest';
import type { AnswerVersion, LevelState, Profile, TeamData } from '../src/api/types';
import { TEAM_VOTE_INTRO, TEAM_VOTE_LEVEL_ID, TEAM_VOTE_QUESTIONS, teamVoteText } from '../src/content/teamVote';
import { questionText } from '../src/mentor/derive';
import { teamVoteChildren, teamVoteCopyText, teamVoteTally } from '../src/mentor/teamVote';
import type { CourseContent } from '../src/content/types';

const profile = (id: string, name: string, at: string): Profile => ({ id, displayName: name, avatar: '🐯', teamId: 't', archivedAt: null, createdAt: at });
const profiles = [profile('p1', 'Đậu', '1'), profile('p2', 'Go-Han', '2'), profile('p3', 'Suri', '3'), profile('p4', 'Bình Minh', '4')];
let n = 0;
const answer = (profileId: string, questionId: string, value: unknown, version = 1, updatedAt = '2026-11-03T12:00:00Z'): AnswerVersion => ({
  id: `a${n++}`, teamId: 't', profileId, contentVersionId: 'cv', levelId: TEAM_VOTE_LEVEL_ID, questionId, partId: 'a',
  value: value as AnswerVersion['value'], dontKnow: false, version, editSession: 's', deviceType: 'phone', createdAt: updatedAt, updatedAt,
});
const sent = (profileId: string, at: string): LevelState => ({
  profileId, levelId: TEAM_VOTE_LEVEL_ID, override: null, formLocked: false, submittedAt: at, completedAt: at, resetCount: 0, pointer: null, updatedAt: at,
});
const data = (answers: AnswerVersion[], levelStates: LevelState[] = []): TeamData => ({ profiles, levelStates, attempts: [], answers, timings: [], contentVersions: [] });
const q = (id: string) => TEAM_VOTE_QUESTIONS.find((x) => x.id === id)!;

describe('Chia tiền lời & Đội mình', () => {
  it('has the nine questions in order, word for word, with fixed options', () => {
    expect(TEAM_VOTE_INTRO).toBe(
      'Bố mẹ đọc câu hỏi cho con nghe. Con tự trả lời. Bố mẹ ghi đúng lời con nói, không sửa, không gợi ý. Nếu con chưa biết thì chọn hoặc ghi "chưa biết".',
    );
    expect(TEAM_VOTE_QUESTIONS.map((x) => x.prompt)).toEqual([
      'Khi bán trò chơi có tiền lời, đội mình chia thế nào?',
      'Phần cho từ thiện, con muốn giúp ai?',
      'Khi nào đội chia tiền lời?',
      'Nếu nhiều bạn chọn khác con, con có đồng ý làm theo ý của nhiều bạn không?',
      'Lúc cả đội chọn ý tưởng trò chơi, con thích nhất điều gì?',
      'Có lúc nào con và các bạn không cùng ý với nhau không? Đó là chuyện gì?',
      'Lúc đó đội làm gì để quyết định?',
      'Con học được gì khi làm việc cùng các bạn?',
      'Lần sau, con muốn đội mình làm tốt hơn điều gì?',
    ]);
    const options = (id: string) => {
      const part = q(id).parts[0];
      return part.type === 'single_choice' ? part.options.map((o) => [o.text, !!o.allowText]) : null;
    };
    expect(options('TV1')).toEqual([
      ['A. 3 phần giữ lại để làm thêm trò chơi, 1 phần cho từ thiện', false],
      ['B. Một nửa giữ lại, một nửa cho từ thiện', false],
      ['C. 1 phần giữ lại, 3 phần cho từ thiện', false],
      ['D. Ý khác của con:', true],
    ]);
    expect(options('TV2')?.map(([t]) => t)).toEqual([
      'A. Các bạn nhỏ khó khăn hoặc bị bệnh',
      'B. Động vật bị bỏ rơi',
      'C. Trường mình (ví dụ thư viện, sân chơi)',
      'D. Môi trường, trồng cây',
      'E. Ý khác của con:',
    ]);
    expect(options('TV2')?.[4][1]).toBe(true);
    expect(options('TV3')).toEqual([
      ['A. Một lần, khi kết thúc cuộc thi (tháng 2)', false],
      ['B. Mỗi tháng một lần', false],
      ['C. Chưa biết', false],
    ]);
    expect(options('TV4')).toEqual([
      ['Có', false],
      ['Không', false],
    ]);
    // Part 2: free text with no length limit.
    for (const id of ['TV5', 'TV6', 'TV7', 'TV8', 'TV9']) expect(q(id).parts).toEqual([{ id: 'a', type: 'text' }]);
  });

  it('reads an answer as written: the option, the own idea after "Ý khác", the text as typed', () => {
    expect(teamVoteText(q('TV1'), { value: { optionId: 'b' }, dontKnow: false })).toBe('B. Một nửa giữ lại, một nửa cho từ thiện');
    expect(teamVoteText(q('TV1'), { value: { optionId: 'd', text: ' chia đều cho cả đội ' }, dontKnow: false })).toBe('D. Ý khác của con: chia đều cho cả đội');
    expect(teamVoteText(q('TV1'), { value: { optionId: 'd' }, dontKnow: false })).toBeNull(); // "Ý khác" with nothing written yet
    expect(teamVoteText(q('TV5'), { value: 'Con thích\nvẽ trò chơi', dontKnow: false })).toBe('Con thích\nvẽ trò chơi');
    expect(teamVoteText(q('TV5'), { value: '   ', dontKnow: false })).toBeNull();
    expect(teamVoteText(q('TV5'), undefined)).toBeNull();
  });

  it('tallies the vote, lists own ideas and who has not answered; the latest answer counts', () => {
    const d = data([
      answer('p1', 'TV1', { optionId: 'a' }, 1),
      answer('p1', 'TV1', { optionId: 'b' }, 2), // changed their mind
      answer('p2', 'TV1', { optionId: 'b' }),
      answer('p3', 'TV1', { optionId: 'd', text: 'cho bà ngoại' }),
    ]);
    const { lines, unanswered } = teamVoteTally(q('TV1'), teamVoteChildren(d));
    expect(lines).toEqual([
      { label: 'A. 3 phần giữ lại để làm thêm trò chơi, 1 phần cho từ thiện', who: [] },
      { label: 'B. Một nửa giữ lại, một nửa cho từ thiện', who: ['Đậu', 'Go-Han'] },
      { label: 'C. 1 phần giữ lại, 3 phần cho từ thiện', who: [] },
      { label: 'D. Ý khác của con', who: ['Suri'] },
      { label: 'cho bà ngoại', who: ['Suri'], own: true },
    ]);
    expect(unanswered).toEqual(['Bình Minh']);
  });

  it('says who has sent, and whether answers changed after sending', () => {
    const d = data(
      [answer('p1', 'TV5', 'trước', 1, '2026-11-03T12:00:00Z'), answer('p2', 'TV5', 'sau', 1, '2026-11-03T13:00:00Z')],
      [sent('p1', '2026-11-03T12:30:00Z'), sent('p2', '2026-11-03T12:30:00Z')],
    );
    const [dau, gohan, suri] = teamVoteChildren(d);
    expect([dau.submittedAt, dau.editedAfter, dau.answered]).toEqual(['2026-11-03T12:30:00Z', false, 1]);
    expect(gohan.editedAfter).toBe(true);
    expect(suri.submittedAt).toBeNull();
  });

  it('copies everything as plain text with names and the answers word for word', () => {
    const d = data(
      [
        answer('p1', 'TV1', { optionId: 'a' }),
        answer('p2', 'TV1', { optionId: 'd', text: 'cho trường' }),
        answer('p1', 'TV6', 'Có.\nBạn muốn làm trò đua xe.'),
        answer('p3', 'TV9', 'Nói nhỏ nhẹ hơn'),
      ],
      [sent('p1', '2026-11-03T12:30:00Z')],
    );
    const text = teamVoteCopyText(teamVoteChildren(d));
    expect(text).toContain('Đã gửi: Đậu\nChưa gửi: Go-Han, Suri, Bình Minh');
    expect(text).toContain(
      [
        '1. Khi bán trò chơi có tiền lời, đội mình chia thế nào?',
        '   - A. 3 phần giữ lại để làm thêm trò chơi, 1 phần cho từ thiện: 1 (Đậu)',
        '   - B. Một nửa giữ lại, một nửa cho từ thiện: 0',
        '   - C. 1 phần giữ lại, 3 phần cho từ thiện: 0',
        '   - D. Ý khác của con: 1 (Go-Han)',
        '     “cho trường” (Go-Han)',
        '   - Chưa trả lời: 2 (Suri, Bình Minh)',
      ].join('\n'),
    );
    expect(text).toContain(
      [
        '6. Có lúc nào con và các bạn không cùng ý với nhau không? Đó là chuyện gì?',
        '   Đậu: Có.',
        '        Bạn muốn làm trò đua xe.',
        '   Go-Han: (chưa trả lời)',
      ].join('\n'),
    );
    expect(text).toContain('   Suri: Nói nhỏ nhẹ hơn');
    expect(text).toContain('   Go-Han: D. Ý khác của con: cho trường');
  });

  it('only counts this section: answers from the levels with the same question id are ignored', () => {
    const other = { ...answer('p1', 'TV1', { optionId: 'a' }), levelId: 'L1' };
    expect(teamVoteChildren(data([other]))[0].answered).toBe(0);
  });

  it('names the question in the CSV export', () => {
    const empty = { levels: [], homework: { items: [] } } as unknown as CourseContent;
    expect(questionText(new Map(), empty, answer('p1', 'TV7', 'x')).question?.prompt).toBe('Lúc đó đội làm gì để quyết định?');
  });
});
