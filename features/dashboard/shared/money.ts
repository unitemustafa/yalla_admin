export function safeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formattedAmount(value: unknown) {
  return safeNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: unknown, currency = "EGP") {
  return `${currency || "EGP"} ${formattedAmount(value)}`;
}

export function formatReferenceCurrency(value: unknown, currency = "EGP") {
  return `${formattedAmount(value)} ${currency || "EGP"}`;
}
