// One input component per part type. A new type: add its component here and its rules in
// src/domain/answers.ts; the `never` check below flags any type left out.
import type { Part } from '../../content/types';
import { checkPart } from '../../domain/answers';
import { RichText } from '../ui';
import { ItemListInput, RepeatInput, SumSplitInput } from './ListInputs';
import { MultiChoiceInput, PickNInput, SingleChoiceInput } from './ChoiceInputs';
import { NumberInput } from './NumberInput';
import { SdgPicker } from './SdgPicker';
import { TextInput } from './TextInput';
import type { PartProps } from './types';

function Input(props: PartProps) {
  const { part } = props;
  switch (part.type) {
    case 'text':
      return <TextInput {...props} part={part} />;
    case 'number':
      return <NumberInput {...props} part={part} />;
    case 'single_choice':
      return <SingleChoiceInput {...props} part={part} />;
    case 'multi_choice':
      return <MultiChoiceInput {...props} part={part} />;
    case 'pick_n':
      return <PickNInput {...props} part={part} />;
    case 'sdg_picker':
      return <SdgPicker {...props} part={part} />;
    case 'item_list':
      return <ItemListInput {...props} part={part} />;
    case 'sum_split':
      return <SumSplitInput {...props} part={part} />;
    case 'repeat':
      return <RepeatInput {...props} part={part} />;
    default: {
      const never: never = part;
      return never;
    }
  }
}

/**
 * A part with its label, input and messages. The "Chưa biết" escape belongs to the question
 * (see FormQuestionScreen); a part only shows that it is set by dimming its input.
 */
export function PartField(
  props: Omit<PartProps, 'labelId'> & {
    fallbackLabelId: string;
    /** After the child tapped "Tiếp" on an unfinished question: this part still needs an answer. */
    missing?: boolean;
    /** An empty "Vì sao…" part after the one-time nudge. */
    nudge?: boolean;
    domId?: string;
  },
) {
  const { part, answer, t, fallbackLabelId, missing, nudge, domId } = props;
  const labelId = part.label ? `label-${part.id}` : fallbackLabelId;
  const check = checkPart(part as Part, answer, t);
  const dontKnow = !!answer?.dontKnow;
  const message = missing ? (check.message ?? t('missingPart')) : null;
  return (
    <div className="part" id={domId}>
      {part.label && part.type !== 'repeat' && (
        <div className="part-label" id={labelId}>
          <RichText text={part.label} />
        </div>
      )}
      <div style={dontKnow ? { opacity: 0.55 } : undefined}>
        <div className="part">
          <Input {...props} labelId={labelId} />
        </div>
      </div>
      {dontKnow && <p className="hint">✓ {t('dontKnow')}</p>}
      {message && (
        <p className="part-message" role="alert">
          {message}
        </p>
      )}
      {nudge && !message && (
        <p className="gentle" role="status">
          {t('whyNudge')}
        </p>
      )}
    </div>
  );
}
