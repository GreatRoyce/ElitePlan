const DAY = 86400000;
export const lagosToday = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

export function dateRange(days, end = lagosToday()) {
  return { start: new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * DAY).toISOString().slice(0, 10), end };
}

export const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
