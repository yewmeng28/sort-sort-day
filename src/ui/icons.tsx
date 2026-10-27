import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Line icons on a 24px grid, drawn in currentColor. Decorative by default; label the control that holds them. */
function Icon({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const MapIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="18" height="8" rx="1.5" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </Icon>
);

/** A pennant: quests are objectives to plant a flag on. */
export const QuestIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 21V3" />
    <path d="M5 4h12l-2.5 4L17 12H5" />
  </Icon>
);

/** A cat's paw for Bandit's den. */
export const DenIcon = (props: IconProps) => (
  <Icon stroke="none" fill="currentColor" {...props}>
    <circle cx="5.5" cy="10" r="2.2" />
    <circle cx="9.5" cy="5.8" r="2.2" />
    <circle cx="14.5" cy="5.8" r="2.2" />
    <circle cx="18.5" cy="10" r="2.2" />
    <path d="M12 11.5c-3.3 0-6 3.1-6 5.6 0 2 1.6 3.4 3.5 3.4 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.9 0 3.5-1.4 3.5-3.4 0-2.5-2.7-5.6-6-5.6Z" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <Icon stroke="none" fill="currentColor" {...props}>
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" />
  </Icon>
);
