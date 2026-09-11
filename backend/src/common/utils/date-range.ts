// A "to" date filter of "2026-09-11" means "through the end of that day,"
// not midnight at its start - comparing with a bare `new Date(dateStr)`
// silently excludes every record created later that same day.
export function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
