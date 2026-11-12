# StudySync Wireframes

Wireframes for the 8 main pages of the StudySync MVP.

## Pages

| # | File | Description |
|---|------|-------------|
| 1 | [01-landing.png](./01-landing.png) | Landing page — value proposition + CTA buttons |
| 2 | [02-login.png](./02-login.png) | Login form |
| 3 | [03-register.png](./03-register.png) | Register form |
| 4 | [04-home-dashboard.png](./04-home-dashboard.png) | Dashboard — stats + recent rooms |
| 5 | [05-friends.png](./05-friends.png) | Friends list + requests + search |
| 6 | [06-create-room.png](./06-create-room.png) | Create room form + invite friends |
| 7 | [07-room-3column.png](./07-room-3column.png) | Room — 3-column: members / timer / chat |
| 8 | [08-history.png](./08-history.png) | Study history + basic stats |

## User Flow
Landing (1)
├── Login (2)
└── Register (3)
↓ after auth
Home / Dashboard (4)
├── Friends (5)
├── Create Room (6) → Room (7)
└── History (8)


## Design Notes

- **Desktop-first**: demo target is desktop; mobile remains usable but not primary
- **3-column room layout**: left = members, center = timer, right = chat
- **Focus Mode** (Priority A): minimized version of Room page
- **Tailwind mapping**: `flex`, `grid`, `gap-4`, `rounded-lg`, `shadow-sm`, `border`
- **Brand color**: blue `#2563eb` (Tailwind `brand-600`)
- **Status colors**: green (online/focus), yellow/orange (break), gray (offline)

## Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| Desktop (≥1024px) | Full 3-column room layout |
| Tablet (768–1023px) | Members collapse to drawer, chat stays as side panel |
| Mobile (<768px) | Timer primary view; members/chat via bottom tabs |

## Accessibility

- Keyboard-visible focus
- Semantic controls (button, input, label)
- Sufficient contrast (WCAG AA)
- Labelled microphone state
- No color-only status cues (icon + text)

## References

- Section 22 — UI and UX
- Section 23 — User flows
- Section 24 — Edge cases
