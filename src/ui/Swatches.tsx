import { SPACE_COLOURS } from '../domain/colour';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

/** The theme's space colours as one-tap swatches, plus a custom colour picker at the end. */
export function Swatches({ value, onChange, label = 'Colour' }: Props) {
  const current = value.toLowerCase();
  const isPreset = SPACE_COLOURS.some((c) => c.hex === current);
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {SPACE_COLOURS.map((c) => (
        <button
          key={c.hex}
          type="button"
          role="radio"
          aria-checked={c.hex === current}
          aria-label={c.name}
          className="swatch"
          style={{ background: c.hex }}
          onClick={() => onChange(c.hex)}
        />
      ))}
      <label className="swatch custom" data-checked={!isPreset || undefined} style={isPreset ? undefined : { background: value }}>
        <input type="color" aria-label="Custom colour" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
