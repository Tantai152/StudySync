# StudySync — Entity Relationship Diagram (Baseline)

> Baseline ERD for MVP. Reflects the data model described in the Software Development Plan (section 11).
> Implementation source of truth: `backend/prisma/schema.prisma` (models added in M2+).

## Diagram

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : "owns"
    USERS ||--o{ FRIEND_REQUESTS : "sends"
    USERS ||--o{ FRIEND_REQUESTS : "receives"
    USERS ||--o{ FRIENDSHIPS : "low side"
    USERS ||--o{ FRIENDSHIPS : "high side"
    USERS ||--o{ BLOCKED_USERS : "blocks"
    USERS ||--o{ BLOCKED_USERS : "blocked by"
    USERS ||--o{ ROOMS : "owns"
    USERS ||--o{ ROOM_MEMBERS : "joins"
    USERS ||--o{ INVITES : "creates"
    USERS ||--o{ INVITES : "receives"
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ STUDY_SESSIONS : "runs"

    ROOMS ||--o{ ROOM_MEMBERS : "has"
    ROOMS ||--o{ INVITES : "issues"
    ROOMS ||--o{ MESSAGES : "contains"
    ROOMS ||--o{ STUDY_SESSIONS : "hosts"

    USERS {
        char(36) id PK
        varchar(255) email UK
        varchar(255) password_hash
        varchar(80) display_name
        varchar(500) avatar_url "nullable"
        enum status "OFFLINE|ONLINE|FOCUS|BREAK|AFK"
        datetime created_at
        datetime updated_at
    }

    REFRESH_TOKENS {
        char(36) id PK
        char(36) user_id FK
        char(64) token_hash UK
        datetime expires_at
        datetime revoked_at "nullable"
        datetime created_at
    }

    FRIEND_REQUESTS {
        char(36) id PK
        char(36) sender_id FK
        char(36) receiver_id FK
        enum status "PENDING|ACCEPTED|REJECTED"
        datetime created_at
        datetime responded_at "nullable"
    }

    FRIENDSHIPS {
        char(36) id PK
        char(36) user_low_id FK
        char(36) user_high_id FK
        datetime created_at
    }

    BLOCKED_USERS {
        char(36) blocker_id PK "FK to users"
        char(36) blocked_id PK "FK to users"
        datetime created_at
    }

    ROOMS {
        char(36) id PK
        char(36) owner_id FK
        varchar(100) name
        varchar(500) description "nullable"
        datetime deleted_at "nullable"
        datetime created_at
        datetime updated_at
    }

    ROOM_MEMBERS {
        char(36) room_id PK "FK to rooms"
        char(36) user_id PK "FK to users"
        enum role "OWNER|MEMBER"
        datetime joined_at
        datetime left_at "nullable"
    }

    INVITES {
        char(36) id PK
        char(36) room_id FK
        char(36) inviter_id FK
        char(36) invitee_id FK "nullable"
        char(64) token_hash UK
        datetime expires_at "nullable"
        int max_uses "default 1"
        int use_count "default 0"
        datetime revoked_at "nullable"
    }

    MESSAGES {
        char(36) id PK
        char(36) room_id FK
        char(36) sender_id FK
        varchar(64) client_id
        varchar(2000) body
        datetime edited_at "nullable"
        datetime deleted_at "nullable"
        datetime created_at
    }

    STUDY_SESSIONS {
        char(36) id PK
        char(36) user_id FK
        char(36) room_id FK "nullable"
        varchar(120) subject
        varchar(500) goal
        enum state "FOCUS|BREAK|ENDED"
        datetime started_at
        datetime ended_at "nullable"
        int duration_seconds "default 0"
        datetime created_at
    }
```

## Tables

| Table | Purpose |
|---|---|
| `users` | Account identity, credentials hash, profile fields, presence status. |
| `refresh_tokens` | Rotating refresh token family; only hashes stored. Cascade delete on user removal. |
| `friend_requests` | Directed pending request from sender to receiver. |
| `friendships` | Accepted friendship, stored once with canonical user ordering (`user_low_id < user_high_id`). |
| `blocked_users` | Directed block relationship; composite PK. |
| `rooms` | Private study room owned by a single user; soft-delete protects history. |
| `room_members` | Membership join table; `role` is `OWNER` or `MEMBER`; `left_at` supports history. |
| `invites` | Token-based invite; only token hash stored; supports expiry, max uses and revocation. |
| `messages` | Persisted room chat; `client_id` used for idempotent delivery. Soft-delete supported. |
| `study_sessions` | Personal study session per user; state machine `FOCUS → BREAK → FOCUS → ENDED`. |

## Key constraints and rules

- **Canonical ordering** for friendships: `user_low_id < user_high_id` + `UNIQUE(user_low_id, user_high_id)` prevents reverse-duplicate.
- **Cascade delete** on `refresh_tokens` when a user is removed.
- **No self-relation**: `friend_requests.sender_id <> receiver_id`; `blocked_users.blocker_id <> blocked_id`.
- **Soft delete** on `rooms` and `messages` via `deleted_at`.
- **Invite rules**: `use_count <= max_uses`; only hash of token stored.
- **Authorization** is enforced in the service layer; FK relationships alone do not grant access.

## Out of scope (post-MVP)

- `user_statistics` — computed from `study_sessions` for MVP; denormalize only if profiling justifies.
- Moderator role — MVP only has `OWNER` / `MEMBER`.
- Message attachments, room categories, notification tables.