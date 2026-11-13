# Trace API

.NET 8 backend for the Trace mobile app. PostgreSQL, EF Core code-first migrations.

```
src/Trace.Api             controllers, JWT, error mapping, Program.cs
src/Trace.Core            entities, DTOs (records), services, repository interfaces
src/Trace.Infrastructure  DbContext, migrations, repositories, hashing/JWT, seeder
tests/Trace.Tests         service tests (EF in-memory)
```

## Run locally

Secrets never go in a committed file. Set them per machine with user-secrets:

```sh
P=src/Trace.Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=trace;Username=postgres;Password=<yours>" --project $P
dotnet user-secrets set "Jwt:Secret" "<random string, at least 32 characters>" --project $P
dotnet user-secrets set "Seed:Admin:Password" "<dev admin password>" --project $P
dotnet user-secrets set "Seed:MasterPassword" "<dev master password>" --project $P

dotnet tool restore
dotnet ef database update -p src/Trace.Infrastructure -s src/Trace.Api
dotnet run --project src/Trace.Api        # http://localhost:5000/swagger
```

In Development the app also migrates and seeds on startup (`Database:MigrateOnStartup`). In other environments, supply the same keys through environment variables (`ConnectionStrings__Default`, `Jwt__Secret`, ...).

Dev seed (`appsettings.Development.json` plus the secrets above):
- admin CNIC `00000-0000000-1`, with the password from `Seed:Admin:Password`
- the master password from `Seed:MasterPassword`, hashed into settings on first run
- roles Receiver / Cutter / Packer (global)
- one session with workflow Received → Cut → Packed, holding boxes `30000001`–`30000008`

Seeding is idempotent and never overwrites values an admin has changed.

## New migration

```sh
dotnet ef migrations add <Name> -p src/Trace.Infrastructure -s src/Trace.Api -o Data/Migrations
```

## Error contract (what `src/api/http.ts` parses)

| Case | Status | Body |
|---|---|---|
| Field validation | 400 | ValidationProblem, `errors.<camelField>[0]` |
| Coded failure | 403/409 | problem, `title` = code (`account_pending`, `account_rejected`, `no_session`, `wrong_session`, `stage_not_in_workflow`, `already_scanned`, `out_of_order`), message in `errors.code[0]` |
| Domain error | 401/403/404/409 | plain string |

## Sessions and workflows

A session owns its workflow (ordered stages), its users and its boxes. Roles are global. A user can operate only when Approved and assigned both an active role and an active session (`POST /admin/users/{id}/approve { roleId, sessionId }`).

Rules for `POST /scans`, all enforced on the server:

| Rule | Failure |
|---|---|
| The box is in the caller's session | 403 `wrong_session` |
| The caller has an active session | 403 `no_session` |
| The role's save stage is a step of the box's session workflow | 403 `stage_not_in_workflow` |
| The box is recorded once per stage | 409 `already_scanned` |
| The previous stage is recorded first; the first stage is free | 409 `out_of_order` ("Must be Cut first.") |

Stage names match case-insensitively, and records use the workflow's spelling. `GET /boxes/lookup` returns the box fields plus `workflow: [{ stageName, position, done, completedByName, completedAt }]`.
