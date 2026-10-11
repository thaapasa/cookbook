import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 18, children, ...props }: IconProps) {
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
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
);

export const ClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Stroke>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m15 6-6 6 6 6" />
  </Stroke>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m9 6 6 6-6 6" />
  </Stroke>
);

export const CloseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);

/** A plate with a fork and a knife, shown in place of a missing photo. */
export function PlateIcon({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="rgba(24,32,27,.35)"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="15" />
      <circle cx="24" cy="24" r="9" />
      <path d="M5 10v10a3 3 0 0 0 3 3v15M43 10v28M43 10c-4 2-4 10 0 13" />
    </svg>
  );
}

export function LogoIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--color-accent)" />
      <path d="M9 17h14a7 7 0 0 1-14 0Z" fill="var(--color-paper)" />
      <path
        d="M13 13c0-2 2-2 2-4M17 13c0-2 2-2 2-4"
        stroke="var(--color-paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
