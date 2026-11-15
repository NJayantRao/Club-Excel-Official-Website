import { FieldType } from "@prisma/client";

export const MAX_OPTIONS = 50;
export const MAX_OPTION_LENGTH = 100;
export const SELECT_NEEDS_OPTION_MESSAGE =
  "A dropdown field needs at least one option.";

/** Trims, removes blanks and duplicates, and caps the number/length of options. */
export function sanitizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;

    const value = item.trim().slice(0, MAX_OPTION_LENGTH);
    if (!value || seen.has(value)) continue;

    seen.add(value);
    result.push(value);

    if (result.length >= MAX_OPTIONS) break;
  }

  return result;
}

interface FieldUpdate {
  name?: string;
  label?: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string | null;
  order?: number | null;
  options: string[];
}

/**
 * Builds a safe update object for a form field (only known keys are copied)
 * and enforces that a SELECT field always has at least one option.
 */
export function buildFieldUpdate(
  data: Record<string, unknown>,
  existing: { type: FieldType; options: string[] }
): { update: FieldUpdate } | { error: string } {
  const update: FieldUpdate = { options: [] };

  if (typeof data.name === "string") update.name = data.name;
  if (typeof data.label === "string") update.label = data.label;
  if (
    typeof data.type === "string" &&
    (Object.values(FieldType) as string[]).includes(data.type)
  ) {
    update.type = data.type as FieldType;
  }
  if (typeof data.required === "boolean") update.required = data.required;
  if (data.placeholder === null || typeof data.placeholder === "string") {
    update.placeholder = data.placeholder;
  }
  if (data.order === null || typeof data.order === "number") {
    update.order = data.order;
  }

  const type = update.type ?? existing.type;

  if (type === FieldType.SELECT) {
    const options =
      data.options !== undefined
        ? sanitizeOptions(data.options)
        : existing.options;

    if (options.length === 0) return { error: SELECT_NEEDS_OPTION_MESSAGE };
    update.options = options;
  }

  return { update };
}
