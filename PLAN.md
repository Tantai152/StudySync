# Plan: Fix Register button crash (Zod v4 incompatibility)

## Goal
Fix the Register button crash on `/register` page where clicking produces no API request and a red JS exception. Root cause: Zod v4's `ZodError` has no `.errors` array, so `@hookform/resolvers/zod`'s `isZodError` check fails and the resolver re-throws instead of returning form errors. This causes an unhandled promise rejection and `onSubmit` is never called.

## Files changed
1. `frontend/src/lib/zodResolver.ts` — NEW: Zod v4-compatible resolver
2. `frontend/src/schemas/auth.schema.ts` — kept `import { z } from 'zod'` (v4)
3. `frontend/src/schemas/room.schema.ts` — kept `import { z } from 'zod'` (v4)
4. `frontend/src/components/RegisterForm.tsx` — use `zodResolverV4`
5. `frontend/src/components/LoginForm.tsx` — use `zodResolverV4`
6. `frontend/src/components/CreateRoomModal.tsx` — use `zodResolverV4`

## Steps
- [x] Fix `auth.schema.ts` import to use `zod/v3` → REVERTED (types incompatible)
- [x] Fix `room.schema.ts` import to use `zod/v3` → REVERTED (types incompatible)
- [x] Create `frontend/src/lib/zodResolver.ts` with Zod v4-compatible resolver
- [x] Update RegisterForm, LoginForm, CreateRoomModal to use new resolver
- [x] Run `npm run build` on frontend — PASS
- [x] Run `npm run lint` on frontend — PASS (0 errors, 0 warnings)
- [x] Verify resolver with valid/invalid data — PASS

## Acceptance
- [x] `npm run build` passes
- [x] `npm run lint` passes (0 errors, 0 warnings)
- [x] `zodResolver` returns errors properly for invalid data instead of throwing
- [x] `onSubmit` is called when validation passes, triggering `api.post`
