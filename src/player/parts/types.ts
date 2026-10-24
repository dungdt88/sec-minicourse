import type { CourseContent, Part } from '../../content/types';
import type { Translate } from '../../content/strings';
import type { PartAnswer } from '../../domain/answers';

export interface PartProps<P extends Part = Part> {
  part: P;
  answer: PartAnswer | undefined;
  onChange: (a: PartAnswer) => void;
  readOnly: boolean;
  t: Translate;
  content: CourseContent;
  /** Earlier answers of the same child (optionsFrom, context). */
  lookup: (questionId: string, partId: string) => PartAnswer | undefined;
  /** Accessible name for the input, usually the question prompt or part label. */
  labelId: string;
}

/** Value of the answer, ignoring it when "Chưa biết" is on. */
export function current<T>(answer: PartAnswer | undefined): T | null {
  return answer && !answer.dontKnow ? (answer.value as T | null) : null;
}

export const set = (value: PartAnswer['value']): PartAnswer => ({ value, dontKnow: false });
