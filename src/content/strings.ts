// Player UI strings. The content file's `ui` object wins; these are the app's additions in the
// same register, used when the content file does not define a key. Listed in README so the
// mentor can override any of them from the content file.
import type { UiStrings } from './types';

export const APP_STRINGS: UiStrings = {
  // From Appendix D (fallbacks if the content file lacks them)
  next: 'Tiếp',
  back: 'Quay lại',
  start: 'Bắt đầu',
  continue: 'Chơi tiếp',
  replay: 'Chơi lại',
  correct: 'Đúng rồi!',
  wrong: 'Chưa đúng. Xem này:',
  dontKnow: 'Chưa biết',
  other: 'Khác',
  submit: 'Nộp phiếu',
  saved: 'Đã lưu',
  yourTurn: 'Đến lượt đội con',
  cards: 'Thẻ khái niệm',
  quiz: 'Câu đố',
  parentReads: 'Bố mẹ đọc thẻ cho con nghe nhé',
  parentTypes: 'Con nói, bố mẹ gõ cũng được',
  levelDone: 'Xong Màn {n}! Hẹn mai nhé.',
  homeworkReminder: 'Nhớ Bài về nhà nhé',
  objectives: 'Mục tiêu (cho bố mẹ)',
  locked: 'Mai mở',
  chooseProfile: 'Con là ai?',
  enterCode: 'Nhập mã của con',
  total: 'Tổng',
  mustEqual: 'Cộng lại phải đúng {total}',
  pickN: 'Chọn đúng {n} câu',
  addOwn: 'Thêm của con',
  // App additions
  cardOf: 'Thẻ {n}/{total}',
  questionOf: 'Câu {n}/{total}',
  today: 'Hôm nay: Màn {n}',
  homework: 'Bài về nhà',
  print: 'In',
  switchProfile: 'Đổi bạn',
  wrongPin: 'Mã chưa đúng. Thử lại nhé.',
  tooManyTries: 'Thử nhiều quá rồi. Đợi {min} phút rồi thử lại nhé.',
  quizDone: 'Xong câu đố!',
  firstTryStars: 'Con trả lời đúng ngay {n} trên {total} câu.',
  review: 'Xem lại phiếu',
  edit: 'Sửa',
  submitted: 'Đã nộp. Con vẫn sửa được.',
  formLocked: 'Phiếu này đã khoá. Con xem được nhưng không sửa được.',
  saving: 'Đang lưu…',
  unsaved: 'Chưa lưu được. Đừng tắt máy, mạng có lại sẽ tự lưu.',
  close: 'Đóng',
  done: 'Xong',
  levelLabel: 'Màn {n}',
  writeOther: 'Ghi thêm một chút nhé.',
  pickAtMost: 'Chọn nhiều nhất {n}',
  pickAtLeast: 'Chọn ít nhất {n}',
  wholeNumber: 'Ghi một số nhé.',
  numberRange: 'Số từ {min} đến {max} thôi nhé.',
  tooManyRows: 'Nhiều nhất {n} dòng.',
  addRow: 'Thêm dòng',
  remove: 'Xoá',
  earlierAnswers: 'Con đã trả lời:',
  noAnswer: '(chưa trả lời)',
  readAloud: 'Đọc to',
  pause: 'Dừng',
  hideHint: 'Đã hiểu',
  loading: 'Đang mở…',
  offlineStart: 'Chưa vào mạng được. Kiểm tra mạng rồi thử lại nhé.',
  retry: 'Thử lại',
  formIntroTitle: 'Đến lượt đội con',
  stickerFor: 'Nhãn dán Màn {n}',
  capture: 'Ghi kết quả',
  homeworkSaved: 'Kết quả được lưu tự động.',
  sdgPick: 'Chạm vào một hình để xem.',
  choose: 'Chọn hình này',
  chosen: 'Đã chọn',
  addPerson: 'Thêm một lượt',
  tally: 'Thêm 1',
  untally: 'Bớt 1',
  preview: 'Xem thử – không lưu',
  backHome: 'Về bản đồ',
  sound: 'Âm thanh',
  pin: 'Mã',
  delete: 'Xoá số',
  forParent: 'Cho bố mẹ',
  sdgCredit: 'Hình Mục tiêu Toàn cầu của Liên Hợp Quốc (un.org/sustainabledevelopment). Nội dung này không được Liên Hợp Quốc duyệt.',
};

export type Translate = (key: string, params?: Record<string, string | number>) => string;

export function makeT(ui: UiStrings | undefined): Translate {
  return (key, params) => {
    let s = ui?.[key] ?? APP_STRINGS[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
