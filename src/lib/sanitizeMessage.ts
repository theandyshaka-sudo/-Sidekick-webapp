// In-app comms must not carry contact info off-platform (HANDOFF.md §11, and the "No Number"
// requirement in the app checklist). Redact anything that looks like a phone number or email
// before a message is stored/shown, so users can't move the conversation off SideKick.

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// A "phone-ish" run: 7+ digits possibly separated by spaces, dashes, dots, parens, or a
// leading +/(. Kept deliberately loose to catch obfuscated numbers, while the 7-digit floor
// avoids nuking prices ("$45") or short quantities.
const PHONE_RE = /[(]?\+?\d[\d\s().-]{5,}\d/g;

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export type SanitizeResult = { text: string; redacted: boolean };

export function sanitizeMessage(input: string): SanitizeResult {
  let redacted = false;

  let text = input.replace(EMAIL_RE, () => {
    redacted = true;
    return "[contact hidden]";
  });

  text = text.replace(PHONE_RE, (match) => {
    if (digitCount(match) >= 7) {
      redacted = true;
      return "[contact hidden]";
    }
    return match;
  });

  return { text, redacted };
}
