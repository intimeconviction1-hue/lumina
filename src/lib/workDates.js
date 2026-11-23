const parisTimeZone = "Europe/Paris";
const displayDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeZone: parisTimeZone,
});
const calendarDate = new Intl.DateTimeFormat("fr-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: parisTimeZone,
});

export function formatWorkDate(value) {
  const date = value && new Date(value);
  return date && Number.isFinite(date.getTime()) ? displayDate.format(date) : "";
}

export function workDateInputValue(value) {
  const date = value && new Date(value);
  if (!date || !Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(calendarDate.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function completionDateLabel(type) {
  if (type === "livre" || type === "article") return "Date de lecture";
  if (type === "podcast") return "Date d’écoute";
  return "Date de visionnage";
}
