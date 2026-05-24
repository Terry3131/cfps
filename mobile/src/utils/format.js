export function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPercent(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.max(0, Math.min(100, Math.round(number)))}%`;
}

export function labelize(value) {
  return String(value || "N/A")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
