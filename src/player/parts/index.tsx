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

/** A part with its label, input, validation message and the "Chưa biết" escape as last option. */
export function PartField(props: Omit<PartProps, 'labelId'> & { allowDontKnow: boolean; fallbackLabelId: string }) {
  const { part, answer, onChange, readOnly, t, allowDontKnow, fallbackLabelId } = props;
  const labelId = part.label ? `label-${part.id}` : fallbackLabelId;
  const check = checkPart(part as Part, answer, t);
  const dontKnow = !!answer?.dontKnow;
  return (
    <div className="part">
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
      {check.message && !dontKnow && (
        <p className="part-message" role="alert">
          {check.message}
        </p>
      )}
      {allowDontKnow && (
        <button
          type="button"
          className="option dont-know"
          role="checkbox"
          aria-checked={dontKnow}
          disabled={readOnly}
          onClick={() => onChange({ value: null, dontKnow: !dontKnow })}
        >
          <span className="mark" aria-hidden="true">{dontKnow ? '✓' : '?'}</span>
          <span>{t('dontKnow')}</span>
        </button>
      )}
    </div>
  );
}
