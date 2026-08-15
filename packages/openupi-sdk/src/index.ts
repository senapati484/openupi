// Core types — safe to import everywhere (browser + Node.js)
export * from './core/types.js';

// HMAC webhook verifier — Node.js only (uses node:crypto)
export * from './core/verify.js';

// OpenUPI Node.js client — safe in server environments
export { OpenUPI } from './node/client.js';

// Re-export node subpath for convenience
// Framework handlers (Express, Next.js, Fastify) are in `openupi-sdk/node`
