import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { MathText } from './Math';
import { parseFieldInteger } from '../core/math';

export function NumberCell({
  value,
  q,
  label,
  onChange,
  onFocus,
  wrapValues = false,
  onRemoveEmpty,
}: {
  value: number;
  q: number;
  label: string;
  onChange: (n: number) => void;
  onFocus?: () => void;
  wrapValues?: boolean;
  onRemoveEmpty?: () => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const draftSource = useRef({ value, q });
  useEffect(() => {
    // Keep all typed digits until editing finishes so live modulo updates
    // do not rewrite the number or move the caret mid-edit.
    if (!wrapValues || value !== draftSource.current.value || q !== draftSource.current.q)
      setDraft(String(value));
    draftSource.current = { value, q };
  }, [value, q, wrapValues]);
  const parse = (raw: string) => {
    if (wrapValues) return parseFieldInteger(raw, q);
    const number = Number(raw);
    return raw !== '' && Number.isInteger(number) && number >= 0 && number < q ? number : null;
  };
  const finishEditing = () => setDraft(String(parse(draft) ?? value));
  return (
    <input
      type="number"
      inputMode="numeric"
      min={wrapValues ? undefined : 0}
      max={wrapValues ? undefined : q - 1}
      step={1}
      aria-label={label}
      aria-invalid={parse(draft) === null}
      title={
        wrapValues
          ? `An integer, reduced modulo ${q} on Enter or when you leave the cell`
          : `A whole number from 0 to ${q - 1}`
      }
      value={draft}
      onFocus={onFocus}
      onBlur={finishEditing}
      onKeyDown={(event) => {
        if (
          onRemoveEmpty &&
          (event.key === 'Backspace' || event.key === 'Delete') &&
          event.currentTarget.value === '' &&
          !event.currentTarget.validity.badInput &&
          !event.nativeEvent.isComposing &&
          !event.repeat &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          // React may reuse this input for the next coefficient, even if its
          // value is identical. Do not carry the deleted cell's blank draft over.
          setDraft(String(value));
          onRemoveEmpty();
          return;
        }
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          finishEditing();
        }
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const number = parse(raw);
        if (number !== null) {
          draftSource.current = { value: number, q };
          onChange(number);
        }
      }}
    />
  );
}

export function Tape({
  values,
  q = 17,
  label,
  editable = false,
  coefficientLabels = false,
  points,
  pointSymbol = 'x',
  onChange,
  active,
  onActive,
  mismatches = [],
  onAdd,
  onRemove,
  onRemoveAt,
  wrapValues = false,
  compact = false,
  hideIndices = false,
  hideMismatchMarks = false,
  onSelect,
  renderBelow,
}: {
  values: readonly number[];
  q?: number;
  label: string;
  editable?: boolean;
  coefficientLabels?: boolean;
  points?: readonly number[];
  pointSymbol?: string;
  onChange?: (index: number, value: number) => void;
  active?: number | null;
  onActive?: (index: number | null) => void;
  mismatches?: readonly number[];
  onAdd?: () => void;
  onRemove?: () => void;
  onRemoveAt?: (index: number) => void;
  wrapValues?: boolean;
  compact?: boolean;
  hideIndices?: boolean;
  hideMismatchMarks?: boolean;
  onSelect?: (index: number) => void;
  renderBelow?: (value: number, index: number) => ReactNode;
}) {
  const tapeRef = useRef<HTMLDivElement>(null);
  const focusAfterRemoval = useRef<number | null>(null);
  useEffect(() => {
    const index = focusAfterRemoval.current;
    if (index === null) return;
    focusAfterRemoval.current = null;
    tapeRef.current?.querySelectorAll('input')[Math.min(index, values.length - 1)]?.focus();
  }, [values.length]);
  return (
    <div
      ref={tapeRef}
      className={`tape-scroll ${compact ? 'tape-compact' : ''} ${points ? 'tape-with-points' : ''}`}
      role="group"
      aria-label={label}
    >
      <div className="tape" onMouseLeave={() => onActive?.(null)}>
        {values.map((value, index) => (
          <div
            className={`tape-column ${active === index ? 'is-active' : ''} ${mismatches.includes(index) ? 'is-changed' : ''}`}
            key={index}
            onMouseEnter={() => onActive?.(index)}
          >
            {!hideIndices && (
              <span className="tape-index">
                {points ? (
                  <MathText>{pointSymbol + '_{' + index + '}=' + points[index]}</MathText>
                ) : coefficientLabels ? (
                  <MathText>{`a_{${index}}`}</MathText>
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </span>
            )}
            <div className="tape-cell">
              {editable && onChange ? (
                <NumberCell
                  value={value}
                  q={q}
                  label={`${label}, ${coefficientLabels ? 'coefficient' : 'position'} ${coefficientLabels ? index : index + 1}`}
                  onChange={(n) => onChange(index, n)}
                  onFocus={() => onActive?.(index)}
                  wrapValues={wrapValues}
                  onRemoveEmpty={
                    onRemoveAt && values.length > 1
                      ? () => {
                          focusAfterRemoval.current = index;
                          onRemoveAt(index);
                        }
                      : undefined
                  }
                />
              ) : onSelect ? (
                <button
                  className="tape-select"
                  aria-label={label + ', position ' + (index + 1) + ', value ' + value}
                  aria-pressed={active === index}
                  onClick={() => onSelect(index)}
                  onFocus={() => onActive?.(index)}
                >
                  {value}
                </button>
              ) : (
                <span>{value}</span>
              )}
            </div>
            {renderBelow?.(value, index)}
            {!hideMismatchMarks && mismatches.includes(index) && (
              <X size={12} className="mismatch-mark" aria-label="Different symbol" />
            )}
          </div>
        ))}
        {onAdd && (
          <div className="tape-column tape-add">
            <span className="tape-index">&nbsp;</span>
            <button className="tape-cell" onClick={onAdd} aria-label="Add coefficient">
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>
      {onRemove && (
        <button className="text-button tape-remove" onClick={onRemove}>
          Remove last coefficient
        </button>
      )}
    </div>
  );
}
