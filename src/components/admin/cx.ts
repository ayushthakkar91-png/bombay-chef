/**
 * Tiny className joiner. Lives in its own module (no "use client") so BOTH
 * server and client components can import it — `primitives.tsx` is a client
 * module, and re-exports from a client module become client references that
 * crash when called during server render.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
