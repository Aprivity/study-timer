const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getLocalDateKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(key: string): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return new Date(Number.NaN);

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return getLocalDateKey(parsed) === key ? parsed : new Date(Number.NaN);
}

export function addLocalDays(date: Date, amount: number): Date {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const daysSinceMonday = (day.getDay() + 6) % 7;
  return addLocalDays(day, -daysSinceMonday);
}

export function endOfLocalWeek(date: Date): Date {
  return addLocalDays(startOfLocalWeek(date), 6);
}

export function isSameLocalDay(left: Date | number, right: Date | number): boolean {
  return getLocalDateKey(left) === getLocalDateKey(right);
}
