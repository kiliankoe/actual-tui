// Mirrors the number formats Actual offers in its settings so amounts look the
// same here as in the web app.
export type NumberFormat =
  "comma-dot" | "dot-comma" | "space-comma" | "apostrophe-dot" | "comma-dot-in";

export interface AmountFormat {
  numberFormat: NumberFormat;
  hideFraction: boolean;
}

export const DEFAULT_AMOUNT_FORMAT: AmountFormat = {
  numberFormat: "comma-dot",
  hideFraction: false,
};

const SEPARATORS: Record<
  NumberFormat,
  { locale: string; thousands: string; decimal: string }
> = {
  "comma-dot": { locale: "en-US", thousands: ",", decimal: "." },
  "dot-comma": { locale: "de-DE", thousands: ".", decimal: "," },
  "space-comma": { locale: "fr-FR", thousands: " ", decimal: "," },
  "apostrophe-dot": { locale: "de-CH", thousands: "’", decimal: "." },
  "comma-dot-in": { locale: "en-IN", thousands: ",", decimal: "." },
};

export function isNumberFormat(value: unknown): value is NumberFormat {
  return typeof value === "string" && value in SEPARATORS;
}

/** Formats integer minor units (cents) the way Actual would display them. */
export function formatAmount(
  cents: number,
  format: Partial<AmountFormat> = {},
): string {
  const { numberFormat, hideFraction } = {
    ...DEFAULT_AMOUNT_FORMAT,
    ...format,
  };
  const digits = hideFraction ? 0 : 2;
  const formatted = new Intl.NumberFormat(SEPARATORS[numberFormat].locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
  // Older ICU versions emit a plain apostrophe for de-CH.
  return numberFormat === "apostrophe-dot"
    ? formatted.replace(/'/g, "’")
    : formatted;
}

/** Parses user input into integer cents, or null if it isn't a number. */
export function parseAmount(
  input: string,
  format: Partial<AmountFormat> = {},
): number | null {
  const { numberFormat } = { ...DEFAULT_AMOUNT_FORMAT, ...format };
  const { thousands, decimal } = SEPARATORS[numberFormat];
  const normalized = input
    .trim()
    .replaceAll(thousands, "")
    .replaceAll(" ", "")
    .replace(decimal, ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  // Shift the decimal point textually so 1.005 becomes 100.5, not 100.49999.
  return Math.round(Number(`${normalized}e2`));
}

export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Digits only, with the format's decimal separator, for prefilling an input. */
export function formatAmountForInput(
  cents: number,
  format: Partial<AmountFormat> = {},
): string {
  const { numberFormat } = { ...DEFAULT_AMOUNT_FORMAT, ...format };
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  const sign = cents < 0 ? "-" : "";
  return `${sign}${whole}${SEPARATORS[numberFormat].decimal}${fraction}`;
}
