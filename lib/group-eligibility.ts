/**
 * Group eligibility for the coding competition (event registration).
 *
 * The student's year is worked out from their roll number, then the group
 * options are filtered by it. Used by BOTH the registration form (to filter
 * the dropdown) and the API (to reject invalid combinations), so the two
 * always agree.
 *
 * To adapt this to another event, change only the settings below.
 */

/**
 * Only these events use the group rule. To use it for another event,
 * add that event's id here (the id in its /events/<id>/register link).
 */
export const GROUP_RULE_EVENT_IDS: string[] = [
  "76074f9f-cd91-4e1b-8a19-b183cdd132fa",
];

export function isGroupRuleEnabled(
  eventId: string | null | undefined
): boolean {
  return !!eventId && GROUP_RULE_EVENT_IDS.includes(eventId);
}

/** Finds the form field that holds the roll number (name or label has "roll"). */
export function findRollNumberField<T extends { name: string; label: string }>(
  fields: T[]
): T | undefined {
  return fields.find((f) => /roll/i.test(f.name) || /roll/i.test(f.label));
}

/** Name of the dropdown field this rule applies to (case-insensitive). */
export const GROUP_FIELD_NAME = "group";

/**
 * Roll numbers start with the 4-digit admission year,
 * e.g. "202456078" -> joined in 2024. Change this if the format differs.
 */
const ADMISSION_YEAR_RE = /^(20\d{2})/;

/** Month the academic year starts (0 = January ... 6 = July). */
const ACADEMIC_YEAR_START_MONTH = 6;

/** Highest year still accepted as a valid student (allows backlog students). */
const MAX_YEAR = 6;

/** Which years can join each group. Group 3 is open to everyone. */
const GROUP_RULES: Record<number, { minYear: number; maxYear: number }> = {
  1: { minYear: 1, maxYear: 1 },
  2: { minYear: 1, maxYear: 2 },
  3: { minYear: 1, maxYear: MAX_YEAR },
};

export function isGroupField(fieldName: string): boolean {
  return fieldName.trim().toLowerCase() === GROUP_FIELD_NAME;
}

/**
 * Returns the student's current year (1 = first year, 2 = second, ...),
 * or null if the roll number is missing, malformed, or not a current student.
 */
export function getAcademicYear(
  rollNumber: string | null | undefined,
  now: Date = new Date()
): number | null {
  const match = ADMISSION_YEAR_RE.exec((rollNumber ?? "").trim());
  if (!match) return null;

  const admissionYear = Number(match[1]);

  let year = now.getFullYear() - admissionYear;
  if (now.getMonth() >= ACADEMIC_YEAR_START_MONTH) year += 1;

  return year >= 1 && year <= MAX_YEAR ? year : null;
}

/** Pulls the group number out of an option label: "Group 2 - Moderate" -> 2 */
function getGroupNumber(option: string): number | null {
  const match = /(\d+)/.exec(option);
  return match ? Number(match[1]) : null;
}

/** Is this dropdown option allowed for a student in the given year? */
export function isGroupAllowed(option: string, year: number): boolean {
  const groupNumber = getGroupNumber(option);
  if (groupNumber === null) return true; // not a numbered group: no rule

  const rule = GROUP_RULES[groupNumber];
  if (!rule) return true; // unknown group number: no rule

  return year >= rule.minYear && year <= rule.maxYear;
}

export function filterGroupOptions(options: string[], year: number): string[] {
  return options.filter((option) => isGroupAllowed(option, year));
}
