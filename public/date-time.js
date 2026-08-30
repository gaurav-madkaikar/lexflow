export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function resolvedTimezone(value) {
  const timezone = String(value || DEFAULT_TIMEZONE);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatZonedDate(value, {
  timezone = DEFAULT_TIMEZONE,
  includeDate = true,
  locale,
} = {}) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(locale, includeDate ? {
    dateStyle: 'medium', timeStyle: 'short', timeZone: resolvedTimezone(timezone), hour12: true,
  } : {
    hour: 'numeric', minute: '2-digit', timeZone: resolvedTimezone(timezone), hour12: true,
  }).format(date).replace(/\b(am|pm)\b/giu, value => value.toUpperCase());
}

export function localDateKey(value, timezone = DEFAULT_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTimezone(timezone), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return date.toISOString().slice(0, 10) === value;
}

export function formatDateKey(value, { style = 'long', locale } = {}) {
  if (!isDateKey(value)) return '';
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, style === 'short'
    ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  ).format(date);
}
