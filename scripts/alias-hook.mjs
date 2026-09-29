/**
 * Teaches plain `node` the `@/*` path alias from tsconfig.json, so the check scripts can import any
 * module under lib/ exactly as the app does — instead of forcing lib/ modules to use relative
 * imports just to stay testable.
 *
 * Used via `node --import ./scripts/alias-hook.mjs scripts/check-*.ts`.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

// import.meta.url is already a proper file URL (spaces encoded once); re-encoding its pathname broke folders with spaces.
const root = new URL('..', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const base = new URL(specifier.slice(2), root).href;
      // Node needs a real file: try the extensions TypeScript would have resolved for us.
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        if (existsSync(new URL(candidate))) return { url: candidate, shortCircuit: true };
      }
      return nextResolve(base, context);
    }
    return nextResolve(specifier, context);
  },
});
