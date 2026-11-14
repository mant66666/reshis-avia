const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDateLabel = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});
const quantity = new Intl.PluralRules('ru-RU');

export function formatDate(date: string) {
  return dateLabel.format(new Date(date));
}

export function formatNumber(value: number) {
  return number.format(value);
}

export function formatShortDate(date: string) {
  return shortDateLabel.format(new Date(date));
}

export function ticketUnit(value: number) {
  switch (quantity.select(value)) {
    case 'one': return 'билет';
    case 'few': return 'билета';
    case 'other': return 'билета';
    default: return 'билетов';
  }
}
