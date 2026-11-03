# StudySync — Study Session Implementation Plan

Goal: Build per-room personal study timer (start/pause/resume/finish/current) with backend API and frontend StudyTimer component, integrated into RoomPage.

Confirmed facts:
- `req.user.userId` (auth middleware attaches `{ userId, email, role }`, not `.id`)
- GET /current with no session → `data: null`, status 200 (no 404)
- Backend uses flat structure: `services/`, `controllers/`, `routes/` (not `modules/`)
- Route file: `backend/src/routes/room.route.ts` (singular)
- Prisma uses `cuid()`
- No global error handler; controllers catch and return formatted envelope or `next(error)` for unexpected errors
- Error pattern: throw `Error` with `statusCode` + `errorCode` props

## Steps

1. Prisma schema: add StudySessionStatus enum, StudySession model, relations on User/Room. Run `prisma db push && prisma generate`. Check: `prisma generate` succeeds, `StudySession` in generated client. — DONE
2. Backend service `backend/src/services/studySession.service.ts`: assertMembership, getOwnedSession, start, pause, resume, finish, current, toDto. Check: TS compiles (typecheck). — DONE
3. Backend controller `backend/src/controllers/studySession.controller.ts`: Zod schemas + handlers with envelope. Check: typecheck passes. — DONE
4. Backend routes `backend/src/routes/studySession.route.ts` + mount in `room.route.ts`. Check: route list matches spec. — DONE
5. Frontend API functions in `frontend/src/api/room.api.ts`. Check: api call signature correct. — DONE
6. Frontend `StudyTimer.tsx` component + integrate into `RoomPage.tsx` as right sidebar (w-72). Check: typecheck passes. — DONE
7. `npm run build` backend + frontend. Check: both pass. — DONE
