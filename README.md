# StudySync

> Study together, independently.

A private productivity and study collaboration web app for trusted friends.

## Overview
StudySync is a web application where friends can study together in invite-only rooms. Each member follows their own independent subject, goal, and timer, emphasizing a "Study together, independently" principle.

## Product Principles
- Study together, independently.
- Private, invite-only rooms.
- Each member follows an independent subject, goal and timer.

## Features and MVP Scope
- [x] Authentication (register, login, logout, refresh token rotation)
- [x] Profile
- [x] Friends (request, accept, list, block)
- [x] Private Rooms & Invitations
- [x] Text Chat (realtime + persisted history)
- [x] Voice Chat (WebRTC audio P2P with STUN)
- [x] Personal Study Sessions (Start, Pause, Resume, Finish)
- [x] History / Dashboard stats
- [x] AI Room Summary & Speech-to-Text (Groq Whisper API)
- [x] API Documentation (Swagger UI / OpenAPI 3.0)

## Tech Stack
- Frontend: React + Vite + TypeScript, React Router, TanStack Query, Axios, TailwindCSS
- Backend: Node.js + Express + TypeScript, Prisma ORM (v7)
- Database: MySQL 8 (Aiven Cloud)
- Realtime: Socket.IO
- Voice: WebRTC (audio only)
- AI: Groq API (Whisper for Transcription, LLM for Summary)
- Auth: JWT access token + rotating refresh token (HTTP-only cookie), **BcryptJS**
- Quality: Vitest, Supertest, React Testing Library, ESLint, Prettier
- Delivery: Docker Compose, GitHub Actions, Vercel + Render + Managed MySQL

## Architecture
- **Frontend:** Single Page Application (SPA) hosted on Vercel.
- **Backend:** REST API + Socket.IO hosted on Render.
- **Database:** Managed MySQL via Aiven.
- **Communication:** REST for CRUD, Socket.IO for realtime Chat/Voice signaling, WebRTC for P2P Audio.

## Repository Structure
- `frontend/` React SPA
- `backend/` Express REST API + Socket.IO
- `docs/` ERD, OpenAPI, wireframes, diagrams
- `docker/` Dockerfiles and compose overrides
- `.github/` CI/CD workflows

## Prerequisites and Environment Variables
- Node.js (v20+)
- MySQL (Local via XAMPP/Laragon or Cloud via Aiven)
- Create a `.env` file in both `frontend/` and `backend/` (copy from `.env.example`).

**Backend Env Required:**
- `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `GROQ_API_KEY`.

**Frontend Env Required:**
- `VITE_API_URL`, `VITE_SOCKET_URL`.

## Local Development

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Docker
Backend is containerized. To build locally:

```bash
docker build -t studysync-backend -f backend/Dockerfile backend/
```

## Database Setup and Migrations
We use Prisma ORM. After making changes to `prisma/schema.prisma`, run:

```bash
npx prisma migrate dev --name <migration_name>
```

## API Documentation
Base URL: `/api/v1`

Swagger UI is available in both local and production environments:

- **Production:** https://studysync-iysw.onrender.com/api-docs
- **Local:** http://localhost:3000/api-docs

## Realtime and Voice Notes
- **Signaling:** Socket.IO handles the WebRTC Offer/Answer/ICE Candidate exchange.
- **Media:** WebRTC P2P uses `stun:stun.l.google.com:19302`. (Note: TURN server is required for strict NATs/mobile networks).
- **ICE:** Early ICE candidates are queued via `pendingIceRef` to prevent signaling errors.

## Deployment
- **Frontend:** Vercel (https://study-sync-gilt-ten.vercel.app)
- **Backend:** Render (https://studysync-iysw.onrender.com)
- **CI/CD:** GitHub Actions (Playwright E2E + Lint/Build)

> **Note:** The backend binds to `0.0.0.0` to ensure Render's internal health check passes successfully.

## Git Workflow and Contribution Rules
- `main` (release only) ← `develop` (integration) ← `feature/*`, `bugfix/*`, `hotfix/*`
- Every change via PR with 1 review from the other member. Squash and merge.
- Commit format: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `docs: ...`).

## Team Members and Ownership
- **Thach (Member A)** — Backend, Voice, Deployment
- **Tài (Member B)** — Frontend, UX, Session, Dashboard

## Known Limitations
- **Render Free Tier:** The backend spins down after 15 minutes of inactivity. Initial requests may take 30-50s to cold start. WebSocket connections may also drop every 5 minutes.
- **WebRTC NAT Traversal:** Without a dedicated TURN server, voice chat may fail on symmetric NAT networks (e.g., some 4G/5G carriers or corporate firewalls).

## Future Improvements
- Integrate a TURN server (e.g., Metered) for 100% voice connectivity.
- Add Redis Adapter for Socket.IO to support horizontal scaling.
- Implement Auto-refresh JWT on the frontend to prevent 401 Unauthorized errors during long study sessions.