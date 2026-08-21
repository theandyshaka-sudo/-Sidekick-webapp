// Deliberately small, obvious-cases-only wordlist for auto-flagging group chat text — this is a
// blunt client-side check, not real moderation. It exists so an obviously bad message doesn't sit
// visible to the whole group until someone reports it; it will miss anything not on this list and
// can false-positive on substrings inside unrelated words is avoided via \b word boundaries.
const BLOCKLIST = [
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "piss",
  "nigger", "nigga", "faggot", "whore", "slut", "retard",
];

const PATTERN = new RegExp(`\\b(${BLOCKLIST.join("|")})\\b`, "i");

export function containsProfanity(text: string): boolean {
  return PATTERN.test(text);
}
