# AGENTS.md — StudySync

## Project
Private productivity & study collaboration web app. Friends study together in invite-only rooms, each following independent subject/goal/timer. Principle: "Study together, independently." Course project, 8-week MVP, 2 devs.

## Team
- Thạch: backend (API, DB, Socket.IO, WebRTC signaling, Docker, deploy)
- Tài: frontend (React SPA, UI/UX, routing, room/timer/dashboard UI)
Both own vertical slices, review each other's PRs.

## Stack (locked)
Frontend: React 18 + Vite 5 + TS 5.5 + React Router v6 + TanStack Query v5 + Axios + Tailwind v3 + RHF + Zod + socket.io-client.
Backend: Node 20 + Express + TS + Prisma + MySQL 8 + Socket.IO + WebRTC (audio only) + JWT (access) + rotating refresh cookie + Argon2id + Zod.
Delivery: Docker Compose, GitHub Actions, Vercel + Render/Railway + managed MySQL, Swagger UI.

## Repo layout
Monorepo: `frontend/`, `backend/`, `docs/`, `docker/`, `.github/`, `docker-compose.yml`, `README.md`.

## Git workflow
Branches: `main` (release only) ← `develop` (integration) ← `feature/*`, `bugfix/*`, `hotfix/*`.
Never push directly to main/develop. Every change via PR with 1 review from the other member. Squash and merge.
Commit format (Conventional Commits): `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs: ...`, `chore: ...`, `refactor: ...`. Scopes: auth, room, chat, voice, session, frontend, backend, db, docker, ci.

## MVP scope (13 items)
Register/login, profile, friend request+list, private room, invitation, join/leave with presence, text chat, voice chat, personal study session (independent timer), history, focus mode UI, room permissions (owner/member), dashboard.
Reliability > breadth. Never sacrifice auth/invite/room/audio/session for bonus features.

## Database essentials
Tables: users, refresh_tokens (hashes only), friend_requests, friendships (canonical ordering), blocked_users, rooms (soft delete), room_members, invites (hashed token, use limits), messages (client_id idempotency), study_sessions.
Stats computed from study_sessions (no separate stats table). Authorization always in service layer, not DB relationships.

## REST conventions
Base `/api/v1`, JSON, UTC ISO 8601, cursor pagination (default 30, max 100).
Envelope: `{success:true,data,meta?}` / `{success:false,message,errorCode,details?}`.
Status: 200/201/204 OK; 400 malformed; 401 unauth; 403 forbidden; 404 hidden; 409 conflict; 422 validation; 500 unexpected.
Error codes SCREAMING_SNAKE (e.g., ACTIVE_SESSION_EXISTS, ROOM_NOT_FOUND).

## Realtime
Socket.IO authenticates via handshake token, attaches userId to socket.data, rechecks room membership on every room-scoped event. chat:send uses clientId as idempotency key. Reconnect triggers fresh join + authoritative state snapshot. Rate limit events, validate payload size, never persist SDP.

## Security rules
Argon2id passwords. Generic login errors. Short-lived access token + Secure/SameSite HTTP-only refresh cookie + hashed rotating refresh tokens. Zod validation on all inputs. Prisma parameterized queries. Strict CORS allowlist. Helmet. Never log passwords, tokens, cookies, SDP, chat bodies. 404 where resource existence must remain hidden. `.env` never committed — only `.env.example`.

## Code quality
Strict TypeScript (no `any`). ESLint + Prettier. Vitest + Supertest + React Testing Library. CI gate: lint + typecheck + tests + build must pass before merge. Critical authorization and state-transition branches require direct tests.

## Voice (WebRTC)
Audio only. Small mesh (cap 4–6). One RTCPeerConnection per peer. Deterministic polite peer to avoid glare. Queue ICE candidates before remoteDescription. Public STUN for dev; TURN only if test evidence requires. Cleanup on leave/disconnect: stop tracks, close connections, remove listeners. Text chat is fallback if voice fails.

## When helping
- Respect the locked stack. Don't introduce new libraries without strong justification.
- Follow existing folder structure and naming.
- Generate code that passes lint + typecheck out of the box.
- Include tests for service/API/state-transition logic.
- Commit messages must follow Conventional Commits.
- Never suggest pushing to main/develop directly.
- Prefer small, focused changes over large refactors.
- Vietnamese comments are fine for internal notes; keep code identifiers in English.
