---
trigger: always_on
---

# GEMINI.md - GigOps Workspace Rules

> This file defines project-specific rules for the GigOps repository.

## 🚀 PERFORMANCE & CLEAN CODE

### Unified Authentication
- **MANDATORY**: Use the single helper `getUserInfo()` (from `lib/auth.ts`) for any auth-related data.
- **FORBIDDEN**: Do not call `getUserRole()` or `getUserEmail()` separately.

### Parallel Data Fetching
- **WATERFALL BAN**: Never make sequential independent Supabase queries.
- **PATTERN**: Use `Promise.all` with `as unknown as Promise<...>` casting.
- **Example**:
```ts
const [gigs, projects, lineups] = await Promise.all([
  supabase.from('go_gigs').select('*') as unknown as Promise<{ data: Gig[] | null }>,
  supabase.from('go_projects').select('*') as unknown as Promise<{ data: Project[] | null }>,
]);
```

### Query Structure & Type Safety
- **Selects**: Specify only required columns. Use relational joins (e.g., `go_projects ( name, color_hex )`) instead of multiple queries.
- **Casting**: Always use the `as unknown as Promise<...>` pattern for Supabase query builders in `Promise.all`.

### File Hygiene & Maintenance
- **Cleanup**: After refactoring or adding new components, delete redundant files/helpers.
- **Verification**: Run `npm run lint` and `npx next build` before finishing tasks.
- **Documentation**: Update `DOCUMENTATION.md` after applying these optimizations.

## 👮 ENFORCEMENT
- Lint rule `no-redundant-auth` must be respected.
- Sequential calls without `Promise.all` will be considered a quality failure.

[ignoring loop detection]
