export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const normalized =
    typeof value === "string"
      ? value.replace(/,/g, "").trim()
      : value;

  const numberValue = Number(normalized);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

export function safeNumber(value, fallback = 0) {
  const normalized =
    typeof value === "string"
      ? value.replace(/,/g, "").trim()
      : value;

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatMoney(amount, currency = "NGN") {
  if (amount === null || amount === undefined || amount === "") {
    return "N/A";
  }

  const numberValue = toNumber(amount);
  const displayCurrency = String(currency || "NGN").toUpperCase();
  const symbols = {
    NGN: "\u20a6",
    USD: "$",
    EUR: "\u20ac",
    GBP: "\u00a3",
  };
  const prefix = symbols[displayCurrency] || displayCurrency;
  const separator = " ";

  return `${prefix}${separator}${numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
