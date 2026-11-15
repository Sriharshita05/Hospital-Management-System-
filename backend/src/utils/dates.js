// Hospital local date helpers (India time).
// Appointment dates are stored as UTC midnight of the calendar date,
// so "today" is also returned as UTC midnight of the Indian date.

export const getTodayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const v = {};
  parts.forEach((p) => { v[p.type] = p.value; });

  const dateString = `${v.year}-${v.month}-${v.day}`;
  const date = new Date(Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day)));

  return { dateString, date };
};

export const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

// Parse YYYY-MM-DD into a UTC-midnight Date, or null if invalid
export const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
};
