// Client-generated UUID v4 — lets a new row be added to local state immediately (optimistic) and
// persisted to Supabase under the same id, with no round trip needed before it's usable.
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
