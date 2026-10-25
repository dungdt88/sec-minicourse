// Types for course-content.json. The JSON schema in schema/course-content.schema.json is the
// source of truth for validation; keep the two in step when adding a field or a part type.

export type Expression = 'neutral' | 'happy' | 'thinking' | 'oops';

export interface Character {
  id: string;
  name: string;
  trait: string;
  catchphrase: string;
  role: string;
  /** Optional artwork per expression, path relative to the app root (e.g. assets/characters/soc-happy.png). */
  images?: Partial<Record<Expression, string>>;
}

export interface Sdg {
  number: number;
  title: string;
  kidCaption: string;
  icon: string;
}

/** A list value means: pick one at random (ui.correctLines, ui.wrongLines, ui.cheers, ui.oops). */
export type UiStrings = Record<string, string | string[]>;

export interface Card {
  id: string;
  order: number;
  title: string;
  body: string;
  bullets?: string[];
  footer?: string | null;
  /** Optional recorded read-aloud audio for this card. */
  audio?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  order: number;
  prompt: string;
  options: QuizOption[];
  explanation: string;
  shuffleOptions?: boolean;
}

export interface ChoiceOption {
  id: string;
  text: string;
  /** "Khác": reveals a short text field. */
  allowText?: boolean;
  /** pick_n only: a leading question that gets gentle feedback once. */
  leading?: boolean;
  feedback?: string;
}

/** Reference to an earlier answer (another question's part). */
export interface AnswerRef {
  questionId: string;
  partId: string;
}

interface PartBase {
  id: string;
  label?: string;
  /** Sentence starter shown in an empty field. */
  placeholder?: string;
  /** Must be filled before Next unless the question is answered "Chưa biết". */
  required?: boolean;
  /** Never blocks Next. */
  optional?: boolean;
}

export interface TextPart extends PartBase {
  type: 'text';
  maxLength?: number;
}

export interface SingleChoicePart extends PartBase {
  type: 'single_choice';
  options: ChoiceOption[];
  /** Show only the options the child chose in an earlier multi_choice (plus ones they added). */
  optionsFrom?: AnswerRef;
}

export interface MultiChoicePart extends PartBase {
  type: 'multi_choice';
  options: ChoiceOption[];
  min?: number;
  max?: number;
  allowAddOwn?: boolean;
}

export interface NumberPart extends PartBase {
  type: 'number';
  unit?: string;
  min?: number;
  max?: number;
}

export interface PickNPart extends PartBase {
  type: 'pick_n';
  n: number;
  options: ChoiceOption[];
}

export interface SdgPickerPart extends PartBase {
  type: 'sdg_picker';
}

export interface ListField {
  id: string;
  type: 'text' | 'number';
  label: string;
  maxLength?: number;
  optional?: boolean;
}

export interface ItemListPart extends PartBase {
  type: 'item_list';
  /** noPrice: the group's rows have no number fields (e.g. things already owned). */
  groups: { id: string; label: string; hint?: string; noPrice?: boolean }[];
  fields: ListField[];
  maxItemsPerGroup?: number;
  /** Show the running total of the number fields, labelled totalLabel. */
  showTotal?: boolean;
  totalLabel?: string;
  /** Rows shown from the start. */
  minRows?: number;
  /** Offer to copy rows from a homework capture list (fills empty rows only, never overwrites). */
  copyFrom?: { homeworkId: string; fieldId: string; groupId: string; toGroupId: string };
}

export interface SumSplitField {
  id: string;
  label: string;
  allowText?: boolean;
  textLabel?: string;
  /** May be left empty; counts as 0 (e.g. "Trả nợ" when the team borrowed nothing). */
  optional?: boolean;
}

export interface SumSplitPart extends PartBase {
  type: 'sum_split';
  total: number;
  unit?: string;
  fields: SumSplitField[];
}

export interface RepeatField {
  id: string;
  type: 'checkbox' | 'tally' | 'text' | 'number';
  label: string;
  maxLength?: number;
}

/** Homework capture only. */
export interface RepeatPart extends PartBase {
  type: 'repeat';
  label: string;
  /** Row label with {n}, e.g. "Bạn {n}". */
  rowLabel?: string;
  min?: number;
  max?: number;
  fields: RepeatField[];
}

export type Part =
  | TextPart
  | SingleChoicePart
  | MultiChoicePart
  | NumberPart
  | PickNPart
  | SdgPickerPart
  | ItemListPart
  | SumSplitPart
  | RepeatPart;

export type PartType = Part['type'];

export interface FormQuestion {
  id: string;
  prompt: string;
  hint?: string;
  parts: Part[];
  allowDontKnow: boolean;
  /** Builder instructions in the source document; never shown to the child. */
  note?: string | null;
  /** Earlier answers shown read-only above the inputs. */
  context?: AnswerRef[];
}

export interface Form {
  title: string;
  intro?: string | null;
  questions: FormQuestion[];
  /** Shown to the parent at the end of the form. */
  note?: string | null;
}

export interface Level {
  id: string;
  order: number;
  title: string;
  name: string;
  objectives: string[];
  cards: Card[];
  quiz: QuizQuestion[];
  form: Form;
  /** Character shown on the level intro; defaults to rotating through the characters. */
  character?: string;
  /** Optional sticker artwork; a generated sticker is used otherwise. */
  sticker?: string;
  /** Estimated minutes on the intro; computed from the counts when absent. */
  minutes?: number;
}

export interface HomeworkItem {
  id: string;
  order: number;
  text: string;
  /** Shows the child's earlier answer with the item (e.g. the two questions picked in L3F2). */
  showAnswer?: AnswerRef;
}

export interface Homework {
  title: string;
  intro: string;
  items: HomeworkItem[];
  capture?: Record<string, Part[]>;
  printable?: boolean;
  /** Levels after which the homework button and reminder are highlighted. */
  remindAfterLevels?: number[];
}

export interface CourseContent {
  schemaVersion: string;
  contentVersion: string;
  locale: string;
  title: string;
  sourceDoc?: string;
  characters: Character[];
  sdg: Sdg[];
  ui: UiStrings;
  levels: Level[];
  homework: Homework;
  zoom?: unknown;
  /** Submission map (FR-M-16). */
  submission?: SubmissionSection[];
}

export interface SubmissionSection {
  part: string;
  section: string;
  questionIds: string[];
  homeworkIds?: string[];
  note?: string;
}

/** Sorted helpers: the file carries `order`, the app never relies on array order. */
export const byOrder = <T extends { order: number }>(xs: T[]): T[] => [...xs].sort((a, b) => a.order - b.order);

export function sortedLevels(c: CourseContent): Level[] {
  return byOrder(c.levels);
}

export function findQuestion(c: CourseContent, questionId: string): { level: Level; question: FormQuestion } | null {
  for (const level of c.levels) {
    const question = level.form.questions.find((q) => q.id === questionId);
    if (question) return { level, question };
  }
  return null;
}

/** Homework capture is stored like form answers, under this pseudo level id. */
export const HOMEWORK_LEVEL_ID = 'HW';
