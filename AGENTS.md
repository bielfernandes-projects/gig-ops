<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:gigops-rules -->
# GigOps Project Rules (from GEMINI.md)

## Authentication
- **MANDATORY**: Use `getUserInfo()` (from `lib/auth.ts`) for any auth data.
- **FORBIDDEN**: `getUserRole()` or `getUserEmail()` directly.

## Parallel Queries
- **WATERFALL BAN**: Never make sequential independent Supabase queries.
- **PATTERN**: `Promise.all` with `as unknown as Promise<...>` casting.

## Query Style
- Specify only required columns; prefer relational joins over multiple queries.
- Use `as unknown as Promise<...>` for Supabase query builders inside `Promise.all`.

## Cleanup & Verification
- Delete redundant files/helpers after refactors.
- Run `npm run lint` and `npx next build` before finishing tasks.
- Update `DOCUMENTATION.md` after optimizations.
<!-- END:gigops-rules -->
