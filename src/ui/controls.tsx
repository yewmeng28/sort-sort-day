interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Names the number for screen readers, e.g. "Quantity". */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Shown after the number, e.g. "%". */
  suffix?: string;
}

/** − value + with big tap targets; no keyboard on iPhone needed. */
export function Stepper({ value, onChange, label, min = 1, max = 9999, step = 1, suffix = '' }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn" aria-label={`Less: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <output aria-live="polite">
        {value}
        {suffix}
      </output>
      <button type="button" className="icon-btn" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string | number> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** A row of mutually exclusive choices. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
