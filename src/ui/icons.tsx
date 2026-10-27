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

export const GearIcon = (props: IconProps) => (
  <Icon {...props}>
    {/* A cog: eight rounded teeth around a hub. */}
    <path d="M10.3 2.5h3.4l.5 2.4 1.6.7 2.1-1.4 2.4 2.4-1.4 2.1.7 1.6 2.4.5v3.4l-2.4.5-.7 1.6 1.4 2.1-2.4 2.4-2.1-1.4-1.6.7-.5 2.4h-3.4l-.5-2.4-1.6-.7-2.1 1.4-2.4-2.4 1.4-2.1-.7-1.6-2.4-.5v-3.4l2.4-.5.7-1.6-1.4-2.1 2.4-2.4 2.1 1.4 1.6-.7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const FlameIcon = (props: IconProps) => (
  <Icon stroke="none" fill="currentColor" {...props}>
    <path d="M12.5 2.5c.6 3-1.3 4.6-2.8 6.3C8.3 10.4 7 12 7 14.5A5 5 0 0 0 12 19.5a5 5 0 0 0 5-5c0-2.2-1-3.6-1.9-4.7-.2 1.4-.9 2.4-1.9 2.9.3-3.4-.5-7.3-2.7-10.2Z" />
  </Icon>
);

/** Quest kinds: gather a category, relieve an overfull space, bring something within reach, move between rooms. */
export const GatherIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    <path d="M9 4l3 3 3-3" />
  </Icon>
);

export const OverfullIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M8 9V6h8v3M12 3v3" />
  </Icon>
);

export const ReachIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v13M6 11l6 6 6-6M5 21h14" />
  </Icon>
);

export const RoomsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11 12 4l9 7v9H3Z" />
    <path d="M9 20v-6h6v6" />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <Icon stroke="none" fill="currentColor" {...props}>
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" />
  </Icon>
);
