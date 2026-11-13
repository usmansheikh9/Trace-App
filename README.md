# Trace

Tracks boxes of exam answer copies through a session's workflow (e.g. Received → Cut → Packed). Each stage scans a box's QR code and records it, in order and only once.

| Folder | What | Stack |
|---|---|---|
| [`mobile/`](mobile) | Scanner app for line staff. What each user sees and can do comes from their role. It shows a box's workflow progress and records their stage. | Expo / React Native, TypeScript |
| [`backend/`](backend) | REST API: auth, roles, sessions and workflows, boxes, scan gating (session scope, strict order, once per stage). | .NET 8, EF Core, PostgreSQL |
| [`portal/`](portal) | Management web admin: sessions and the workflow builder, users and assignment, roles, boxes, settings. | React 18, Vite, Material UI |

## Getting started

1. **Backend**: see [`backend/README.md`](backend/README.md). Secrets (DB connection, JWT key, seed passwords) go in `dotnet user-secrets`, never in a committed file.
2. **Portal**: `cd portal && npm install && npm run dev`, then open http://localhost:5173. Set `VITE_API_URL` in `.env.local` if the API isn't on `http://localhost:5000`.
3. **Mobile**: `cd mobile && npm install`, copy `.env.example` to `.env` and set your machine's LAN IP, then `npm start` with the Expo dev client.
