export const INSTITUTE_EMAIL_DOMAIN = "nist.edu";

const INSTITUTE_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@nist\.edu$/i;

export function isInstituteEmail(value: string): boolean {
  return INSTITUTE_EMAIL_RE.test(value.trim());
}

/** Is this form field an "institute email" field? (checks its name and label) */
export function isInstituteEmailField(field: {
  name: string;
  label: string;
}): boolean {
  const matches = (text: string) =>
    /mail/i.test(text) && /institute|institution|nist/i.test(text);

  return matches(field.name) || matches(field.label);
}

export function getInstituteEmailError(
  fields: { name: string; label: string }[],
  answers: Record<string, unknown> | null | undefined
): string | null {
  for (const field of fields) {
    if (!isInstituteEmailField(field)) continue;

    const value = answers?.[field.name];
    if (value === undefined || value === null || value === "") continue;

    if (typeof value !== "string" || !isInstituteEmail(value)) {
      return `${field.label} must be a valid @${INSTITUTE_EMAIL_DOMAIN} email.`;
    }
  }

  return null;
}
