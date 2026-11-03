# StudySync — WebRTC Voice P2P Implementation Plan

Goal: Build WebRTC voice P2P signaling on separate Socket.IO namespace `/voice` (mesh, max 4 users/room, audio only), with frontend hook + VoicePanel integrated into RoomPage sidebar.

Confirmed facts:
- Chat namespace `/` already exists (do NOT modify)
- Socket auth: `socket.handshake.auth?.token` → JWT verify → `socket.userId` (existing pattern)
- Frontend socket: `io(baseURL, { auth: { token } })`, token from `getAccessToken()`
- Prisma uses `cuid()`, RoomMember compound unique `roomId_userId`
- RoomPage sidebar already has StudyTimer (w-72) — add VoicePanel below it

## Steps

1. Backend `backend/src/socket/voice.socket.ts`: registerVoiceNamespace(io), `/voice` namespace, auth middleware, in-memory Map state, all signaling events with Zod validation. Check: backend `tsc --noEmit` passes. — DONE
2. Mount in `backend/src/index.ts`: import + call `registerVoiceNamespace(io)` after `setupSocket(io)`. Check: build passes. — DONE
3. Frontend `frontend/src/hooks/useVoiceRoom.ts`: hook with { state, peers, error, join, leave }, RTCPeerConnection mesh logic, socket events. Check: FE typecheck. — DONE
4. Frontend `frontend/src/components/VoicePanel.tsx`: component rendering idle/connecting/connected/error states, peer audio elements. Check: FE typecheck + lint. — DONE
5. Integrate into `frontend/src/pages/RoomPage.tsx`: add VoicePanel in sidebar below StudyTimer. Check: FE build + lint. — DONE
6. `npm run build` BE + FE, `npm run lint` FE. Check: all pass. — DONE
4. Frontend `frontend/src/components/VoicePanel.tsx`: component rendering idle/connecting/connected/error states, peer audio elements. Check: FE typecheck + lint.
5. Integrate into `frontend/src/pages/RoomPage.tsx`: add VoicePanel in sidebar below StudyTimer. Check: FE build + lint.
6. `npm run build` BE + FE, `npm run lint` FE. Check: all pass.
