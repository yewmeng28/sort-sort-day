/** Bandit, the cat who "borrows" your things. Decorative unless given a label. */
export function Mascot({ size = 32, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}mascot.svg`}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={['mascot', className].filter(Boolean).join(' ')}
    />
  );
}
