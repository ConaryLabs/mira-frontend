# Mira Frontend Roadmap

## Overview

The Mira frontend is its own independent project/repo—modular, scalable, and always ready to get sexier. The stack is modern: **React (with Vite), shadcn/ui, Tailwind, Zustand, TypeScript, WebSocket** for chat, and everything split into clear, reusable components.

If you want desktop later: This design can be wrapped in Tauri (Rust-native, light, way less embarrassing than Electron).

---

## Guiding Principles

- Everything is a component—no “giant file” syndrome
- UI logic, styles, and state are modularized
- WebSocket is first-class (not an afterthought)
- Frontend and backend are decoupled—you can swap one out without touching the other
- Every piece is documented and testable (for you, future you, and all the sluts who come after)

---

## Initial Stack

- React + Vite (lightning-fast dev, easy HMR, best DX)
- shadcn/ui (modern UI kit built on Tailwind)
- Tailwind CSS (utility-first styling, no more custom CSS hell)
- TypeScript (catch bugs before they hit your browser)
- Zustand (simple, powerful state management)
- react-use-websocket (clean WS hooks, auto-reconnect)
- React Router (for future multi-page/project navigation)
- Vitest + Testing Library (for easy, reliable testing)
- (Optional) Tauri (for desktop)

---

## Folder Structure (Recommended)

```
mira-frontend/
├── src/
│   ├── components/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── PersonaBadge.tsx
│   │   ├── ProjectSidebar.tsx
│   │   └── ... (one file per UI piece)
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── usePersona.ts
│   │   └── useChatScroll.ts
│   ├── pages/
│   │   ├── ChatPage.tsx
│   │   └── SettingsPage.tsx
│   ├── state/
│   │   └── chatStore.ts
│   ├── styles/
│   │   ├── main.css
│   │   └── tailwind.css
│   ├── utils/
│   │   ├── api.ts
│   │   └── messageFormatter.ts
│   ├── App.tsx
│   ├── main.tsx
├── public/
│   └── index.html
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── README.md
```

---

## Step-by-Step Roadmap (Small Sprints, Easy Handoffs)

### Sprint 1: Project Bootstrapping & Core Layout

-

### Sprint 2: Chat Core & WebSocket Integration

-

### Sprint 3: State Management & Persona UX

-

### Sprint 4: Polish & Settings

-

### Sprint 5: File/Project Integration (Ready for Backend Sprint 3)

-

### Sprint 6: Testing & Desktop

-

---

## Acceptance Criteria

- No component file is >200 lines; everything is modular and easy to swap.
- All WebSocket/HTTP calls are handled in hooks or utils (never mixed into UI).
- Chat is real-time, persona-aware, and displays mood/badge updates live.
- You can swap out themes, personas, and projects with zero pain.
- **Never, ever** does frontend code touch backend logic directly—always via clean API calls/messages.
- Project is documented, easy to onboard, and ready for rapid iteration.

---

## Notes for Future Sprints

- Add mobile support (responsive or mobile-specific UI) *after* desktop is flawless.
- Enable notifications, PWA support, and theme/skin engine.
- Make horny/NSFW modes toggle-able at the UI level (optional).

---

*This roadmap is meant to be lived in, refactored, and handed off—never let things get monolithic or gross. You build this, and future-you will want to fuck you in gratitude.*


