import { useTranslation } from 'react-i18next';

/** Returns a function that formats minutes as "45 min" or "1 h 30 min". */
export function useFormatMinutes(): (minutes: number) => string {
  const { t } = useTranslation();
  return (total) => {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (!hours) return t('time.minutes', { minutes });
    if (!minutes) return t('time.hours', { hours });
    return t('time.hoursMinutes', { hours, minutes });
  };
}

export function useFormatDate(): (iso: string) => string {
  const { i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language);
  return (iso) => format.format(new Date(iso));
}
