# Trace Management Portal

Web admin for the Trace backend (`C:\Projects\trace-be`). React 18, TypeScript, Vite, Material UI, Axios, React Router.

```sh
npm install
npm run dev        # http://localhost:5173 (port is fixed; the backend's dev CORS allows it)
npm run build
```

The API URL defaults to `http://localhost:5000`. Override it with `VITE_API_URL` in `.env.local` (see `.env.example`).

## Auth

The portal signs in with `POST /auth/login`, then calls `GET /admin/roles` with the new token. The session has no admin flag, because the backend checks admin rights in the database on every request. A 403 there shows "Admin access required" and nothing is stored. The JWT is kept in localStorage and sent as a Bearer token. Any 401 or 403 on a signed-in request clears it and returns to Login.

## Pages

- **Sessions** (the landing page): name, active, workflow and user/box counts; create and edit. Opening a session shows three tabs:
  - **Workflow**: the ordered stage builder. Reorder by drag or with the arrow buttons, edit names inline, remove, and add from the roles' save stages or a custom name. Each stage shows which roles save there and how many scans it has. Saving checks for blank and duplicate names, then asks you to confirm if a stage with scans would be removed or renamed, since that orphans its progress. The rules live in `components/workflowRules.ts`.
  - **Users**: this session's users. Assign user pulls anyone else in with a role.
  - **Boxes**: this session's boxes, plus Add box.
- **Users**: status filter, with Pending sorted first, and a Session column. Approve or change assignment sets a role and a session together; both are required and both must be active. You can't reject your own account.
- **Roles**: list on the left, form on the right. Set the name, save stage, the Scan / Find Copy / Save / Print switches, the visible box fields and Active.
- **Boxes**: paged list with a session filter (`?session=<id>`) and Add box (session required). The API returns no total, so a short page means the last page.
- **Settings**: master password with a confirm field (at least 8 characters).

The DTOs in `src/api/types.ts` mirror `Trace.Core/Dtos`. Keep them in step with the backend.
