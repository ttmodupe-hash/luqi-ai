import type { Handler } from 'hono';

// Process liveness: intentionally makes no claim about Omega/Khoro workers,
// databases, model providers, paid replies or customer accounts.
export const runtimeLiveness: Handler = c => {
  c.header('Cache-Control', 'no-store');
  return c.json({ status: 'healthy', timestamp: Date.now(), service: 'luqi-ai-engine' });
};
