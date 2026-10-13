# Operations and schema

## Application boundaries

Next.js serves the portal, Payload admin and APIs from one origin. Payload is the sole authentication and data-access layer. Custom commands run in Node.js with collection/field access enabled. Approved policy evaluation is pure TypeScript. There is no separate Express application, worker or second ORM.

## Collections

| Collection | Relationships and integrity |
|---|---|
| users | Role, course/batch scopes, optional student/company relationship, explicit salary/contact grants; administrator-provisioned |
| students | Unique normalized Placement ID, course/batch and archived flag; confidential contact fields |
| placement-sessions | Academic session and policy version |
| registrations | Student + session; unique composite key; status, academic verification, shared concurrency revision |
| companies | Recruiter organization |
| drives | Company + session; offer type, package/stipend, course and academic criteria, deadline |
| applications | Student + drive; unique composite key, company/session, decision snapshot and stage |
| activities | Recruitment event belonging to a drive |
| attendance | Student + activity; unique composite key; absence creates a review |
| offers | Student + session + company, optional campus drive; unique campus student/drive key; CTC and stipend kept separate |
| policy-versions | Typed thresholds and ambiguity choices; immutable after approval |
| review-cases | Student + session and optional drive/company; scoped exceptions, proposals, attendance exclusions and correction requests |
| audit-events | Actor, target, action, time, redacted details, HMAC; optional unique command identifier |

Money is integer INR. Dates are UTC; portal dates display in Asia/Kolkata. Review and audit details preserve lifecycle history. No normal UI or public API can hard-delete domain or audit records.

## API surface

| Route | Purpose |
|---|---|
| `/api/users/login`, `/logout`, `/me` | Payload authentication under the users collection |
| `GET /api/placement/workspace?session=...` | Current user's scoped records and reports; no public caching |
| `POST /api/placement/command` | Strict command union; same-origin JSON and Idempotency-Key required |
| `POST /api/placement/import` | CSV string with `commit: false/true`; validation is repeated at commit |
| `GET /api/placement/export?session=...&kind=students|offers&purpose=...` | Protected CSV; compensation exports require the salary permission |
| `/api/{collection}` | Payload-generated API; protected writes remain blocked by collection hooks/access |

Commands: create/edit/archive student, register, apply, advance application, issue offer, transition offer, record attendance, request review and resolve review. IDs, ownership, linked records, money and timing are validated server-side. GraphQL is disabled.

Each sensitive command writes its state and audit inside one MongoDB transaction. Eligibility-affecting commands update a common registration revision to conflict with simultaneous decisions. A conflict returns 409; callers must refresh and retry. A completed idempotency key returns an already-completed response without repeating the mutation. CSV import commits each row independently and reports partial completion rather than silently discarding failures.

## Session and provisioning behavior

Payload hashes passwords, locks accounts after five failed attempts for 15 minutes, and maintains revocable server-side sessions. Tokens last one hour; refreshed sessions are capped at eight hours from login. Disabled users and expired sessions fail application access checks. Session identities are reloaded by Payload, so role changes do not depend on browser-supplied claims.

Bootstrap is a local operator command and refuses existing user stores. The public first-user path cannot bypass the user collection's provisioning hook. Keep the initial administrator password out of source and remove it from `.env.local` after use. For deployment use a secret manager; never put database/audit/authentication secrets in NEXT_PUBLIC variables.

## Audit verification and checkpoints

Run `npm run audit:verify` to verify existing event signatures. Run `npm run audit:checkpoint` to emit a signed ordered manifest, then transfer it to independently controlled immutable storage. Supply the retained manifest path to `npm run audit:verify -- <path>` to detect missing or changed anchored events. Later events may legitimately follow the snapshot. Application signatures cannot defend against an attacker who controls both the application and its signing key.

Sensitive read auditing fails closed. Concurrent row-read audit writes are serialized per request to avoid racing on a shared database session. Audits remove password/token/session/contact values; contact reads record the field names and target rather than copying the contact values. Authorized audit viewers are administrators.

## Recovery and production readiness

Enable encrypted Atlas backups, restrict the application DB principal to the project database, and set network access to the deployment's addresses. Provision backup retention and immutable checkpoint storage under separately controlled permissions. Before real records are entered, restore a backup to an isolated database and verify that records, unique indexes and signed history are present. Validate application login and workflows against that restored environment. Document the measured recovery time and backup age; the plan's 24-hour RPO / 4-hour RTO are proposed targets, not verified guarantees.

Institutional owners must define retention/anonymization and holds before hard deletion is introduced. Archive is available now and preserves history. Schedule checkpoint generation and alert on failed backups/audit verification using the deployment platform; those external services are not configured in this repository.

## Verification constraints

Per the user's instruction, the implementation contains no test-case files. Compiler/linter/build checks and in-memory checks do not prove database authorization or transaction behavior. Atlas-backed verification and recovery remain pending configuration. Policy approval is also pending the complete institutional guidelines.
