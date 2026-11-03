// "Chia tiền lời & Đội mình": each child's own vote on the profit split and their words for the
// teamwork reflection (Milestones 3–4). A section of its own beside Màn 1–7, defined here rather
// than in course-content.json, so it needs no content upload. Answers are stored like form
// answers, under level id TEAM_VOTE_LEVEL_ID; "Gửi" is the level's submit. Children never see
// each other's answers or any count: only the mentor console reads them.
import type { FormQuestion } from './types';

export const TEAM_VOTE_LEVEL_ID = 'TV';
export const TEAM_VOTE_TITLE = 'Chia tiền lời & Đội mình';
export const TEAM_VOTE_INTRO =
  'Bố mẹ đọc câu hỏi cho con nghe. Con tự trả lời. Bố mẹ ghi đúng lời con nói, không sửa, không gợi ý. Nếu con chưa biết thì chọn hoặc ghi "chưa biết".';

/** Every question has one part with this id: a single choice (part 1) or a text (part 2). */
export const TEAM_VOTE_PART = 'a';

const choice = (id: string, prompt: string, options: string[], otherLast = false): FormQuestion => ({
  id,
  prompt,
  allowDontKnow: false,
  parts: [
    {
      id: TEAM_VOTE_PART,
      type: 'single_choice',
      options: options.map((text, i) => ({ id: String.fromCharCode(97 + i), text, ...(otherLast && i === options.length - 1 ? { allowText: true } : {}) })),
    },
  ],
});

const text = (id: string, prompt: string): FormQuestion => ({
  id,
  prompt,
  allowDontKnow: false,
  parts: [{ id: TEAM_VOTE_PART, type: 'text' }],
});

export const TEAM_VOTE_SECTIONS: { title: string; questions: FormQuestion[] }[] = [
  {
    title: 'Phần 1 – Chia tiền lời',
    questions: [
      choice(
        'TV1',
        'Khi bán trò chơi có tiền lời, đội mình chia thế nào?',
        [
          'A. 3 phần giữ lại để làm thêm trò chơi, 1 phần cho từ thiện',
          'B. Một nửa giữ lại, một nửa cho từ thiện',
          'C. 1 phần giữ lại, 3 phần cho từ thiện',
          'D. Ý khác của con:',
        ],
        true,
      ),
      choice(
        'TV2',
        'Phần cho từ thiện, con muốn giúp ai?',
        [
          'A. Các bạn nhỏ khó khăn hoặc bị bệnh',
          'B. Động vật bị bỏ rơi',
          'C. Trường mình (ví dụ thư viện, sân chơi)',
          'D. Môi trường, trồng cây',
          'E. Ý khác của con:',
        ],
        true,
      ),
      choice('TV3', 'Khi nào đội chia tiền lời?', ['A. Một lần, khi kết thúc cuộc thi (tháng 2)', 'B. Mỗi tháng một lần', 'C. Chưa biết']),
      choice('TV4', 'Nếu nhiều bạn chọn khác con, con có đồng ý làm theo ý của nhiều bạn không?', ['Có', 'Không']),
    ],
  },
  {
    title: 'Phần 2 – Đội mình làm việc cùng nhau',
    questions: [
      text('TV5', 'Lúc cả đội chọn ý tưởng trò chơi, con thích nhất điều gì?'),
      text('TV6', 'Có lúc nào con và các bạn không cùng ý với nhau không? Đó là chuyện gì?'),
      text('TV7', 'Lúc đó đội làm gì để quyết định?'),
      text('TV8', 'Con học được gì khi làm việc cùng các bạn?'),
      text('TV9', 'Lần sau, con muốn đội mình làm tốt hơn điều gì?'),
    ],
  },
];

export const TEAM_VOTE_QUESTIONS = TEAM_VOTE_SECTIONS.flatMap((s) => s.questions);

/** The vote questions (part 1), tallied in the mentor console. */
export const TEAM_VOTE_TALLIED = TEAM_VOTE_SECTIONS[0].questions;

interface Answer {
  value: unknown;
  dontKnow: boolean;
}

/** The answer as the parent wrote it: the chosen option (with the child's own idea) or the text. */
export function teamVoteText(q: FormQuestion, a: Answer | undefined | null): string | null {
  if (!a || a.dontKnow || a.value == null) return null;
  const part = q.parts[0];
  if (part.type === 'single_choice') {
    const v = a.value as { optionId?: string; text?: string };
    const option = part.options.find((o) => o.id === v.optionId);
    if (!option) return null;
    if (!option.allowText) return option.text;
    const own = v.text?.trim();
    return own ? `${option.text} ${own}` : null;
  }
  return typeof a.value === 'string' && a.value.trim() ? a.value : null;
}
