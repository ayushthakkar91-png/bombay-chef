// Vitest/Vite resolution stub for the "server-only" package.
//
// Next.js's own webpack/turbopack config aliases the "server-only" import
// specifier to an internal no-op module so files can mark themselves
// server-only without shipping a real npm package. Vitest uses Vite's
// resolver instead of Next's, which has no such built-in alias, so any
// unit test that imports a file starting with `import "server-only"`
// fails to resolve it. This shim — aliased in vitest.config.ts — fills
// that gap for tests only; it has no effect on the Next.js build.
export {};
