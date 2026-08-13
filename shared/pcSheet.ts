function toIsoDate(month: string, day: string, year: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Extracts the application signature date, ignoring the signature time. */
export function extractApplicationDate(text: string) {
  const normalized = text.replace(/\s+/g, " ");
  const match =
    normalized.match(
      /Date\s*(?:and|&)\s*Time\s*e[- ]?Signed\s*:?\s*(?:\|\s*)?(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?(?:\s+[A-Z]{2,5})?)?/i
    ) ||
    normalized.match(
      /e[- ]?Signed\s+by\s+[^|\n]{1,120}?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{1,2}:\d{2}(?::\d{2})?/i
    );
  return match ? toIsoDate(match[1], match[2], match[3]) : "";
}
