/** Shared Tailwind classes for form controls. */

export const fieldClass =
  'min-h-12 w-full rounded-xl border border-field bg-card px-3.5 py-2.5 text-base text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent data-invalid:border-accent-strong';

export const labelClass = 'text-sm font-semibold text-ink-soft';

export const optionalClass = 'font-normal text-muted';

export const errorClass = 'text-sm text-accent-strong';

export const primaryButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5.5 text-[15px] font-semibold text-white no-underline data-disabled:cursor-default data-disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-field bg-card px-5 text-[15px] font-semibold text-ink no-underline';
