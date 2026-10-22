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
- [x] Authentication (register - *done*, login, logout, refresh)
- [ ] Profile
- [ ] Friends (request, accept, list, block)
- [ ] Private Rooms
- [ ] Invitations
- [ ] Text Chat (realtime + persisted history)
- [ ] Voice Chat (WebRTC audio)
- [ ] Personal Study Sessions
- [ ] History / Dashboard

## Tech Stack
- Frontend: React + Vite + TypeScript, React Router, TanStack Query, Axios, TailwindCSS
- Backend: Node.js + Express + TypeScript, Prisma ORM (v7)
- Database: MySQL 8
- Realtime: Socket.IO
- Voice: WebRTC (audio only)
- Auth: JWT access token + rotating refresh token (HTTP-only cookie), **BcryptJS**
- Quality: Vitest, Supertest, React Testing Library, ESLint, Prettier
- Delivery: Docker Compose, GitHub Actions, Vercel + Render + Managed MySQL

## Architecture
TBD

## Repository Structure
- `frontend/` React SPA
- `backend/` Express REST API + Socket.IO
- `docs/` ERD, OpenAPI, wireframes, diagrams
- `docker/` Dockerfiles and compose overrides
- `.github/` CI/CD workflows

## Prerequisites and Environment Variables
- Node.js (v20+)
- MySQL (via XAMPP or Laragon)
- Tạo file `.env` trong thư mục `backend/` (copy từ `.env.example`) và cấu hình biến `DATABASE_URL` trỏ tới MySQL local của bạn.

## Local Development

### 1. Backend Setup
```bash
cd backend
npm install

# Generate Prisma Client
npx prisma generate

# Apply database migrations (Yêu cầu MySQL đang chạy)
npx prisma migrate dev

# Start dev server
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start dev server
npm run dev
```

## Docker
TBD

## Database Setup and Migrations
We use Prisma ORM. After making changes to `prisma/schema.prisma`, run:
```bash
npx prisma migrate dev --name <migration_name>
```

## API Documentation
Base URL: `/api/v1`

- `POST /auth/register` - Đăng ký tài khoản
- `POST /auth/login` - Đăng nhập (Coming soon)

## Realtime and Voice Notes
TBD

## Testing
TBD

## Deployment
TBD

## Git Workflow and Contribution Rules
- `main` (release only) ← `develop` (integration) ← `feature/*`, `bugfix/*`, `hotfix/*`
- Never push directly to `main`/`develop`.
- Every change via PR with 1 review from the other member. Squash and merge.
- Commit format: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `docs: ...`).

## Team Members and Ownership
- Thach (Member A) — Backend, Voice, Deployment
- Tài (Member B) — Frontend, UX, Session, Dashboard

## Screenshots and Demo
TBD

## Known Limitations
TBD

## Future Improvements
TBD