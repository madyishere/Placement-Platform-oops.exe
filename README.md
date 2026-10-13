# Placement Office · NFSU

A TypeScript **Next.js 16 + Payload 3 + MongoDB** placement-management application. One application, one authentication system, one database. No project test-case files or test framework were added, as requested.

## Run locally

Requires Node.js 22.14+ and a MongoDB Atlas database (or a MongoDB replica set). A standalone MongoDB server is not supported for the audited workflows.

1. Run `npm install`.
2. Run `npm run setup`. This creates an ignored `.env.local` with two independent random secrets, without overwriting existing configuration.
3. Fill in `DATABASE_URI`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`. Use a password of at least 14 characters. Keep `NEXT_PUBLIC_SERVER_URL=http://localhost:3000` for local use.
4. Run `npm run bootstrap` once. It creates the administrator, 2026–27 placement session and a **draft, unapproved** policy. It refuses to run if users already exist.
5. Remove `ADMIN_PASSWORD` from `.env.local` after successful bootstrap.
6. Run `npm run dev -- --webpack` and open [the workspace](http://localhost:3000). Sign in at [login](http://localhost:3000/login). Staff administration is at [admin](http://localhost:3000/admin).

Atlas configuration is supplied by you. The app shows a setup screen until its database and secrets are configured. No real student records, demo credentials, or fabricated placement statistics are seeded.

For an optimized deployment: `npm run build`, then `npm start`. Production requires HTTPS; authentication cookies are Secure in production. Set the public server URL to the actual application origin.

## Local Docker database

With Docker Desktop running, create a dedicated development database once:

```powershell
docker run -d --name placement-mongo -p 127.0.0.1:27018:27017 -v placement-mongo-data:/data/db mongo:8.0 --replSet rs0 --bind_ip_all
docker exec placement-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Set `DATABASE_URI=mongodb://127.0.0.1:27018/placement?replicaSet=rs0&directConnection=true` in `.env.local`. Wait for `docker exec placement-mongo mongosh --quiet --eval 'db.hello().isWritablePrimary'` to return `true`, then run bootstrap. This container is bound only to the local machine and has no database authentication; it is for local development only.

On subsequent runs, use `docker start placement-mongo`; do not recreate or reinitialize it. `docker stop placement-mongo` stops it without deleting its data. Records persist in the `placement-mongo-data` volume and are separate from Atlas.

## Hackathon dataset

See [demo-data/README.md](demo-data/README.md) for 152 fictional records, MongoDB Compass JSON files, a student CSV and a presentation walkthrough. `npm run demo:import` previews the dataset; `npm run demo:import -- --apply` imports it into the configured local database through Payload with audit records. Use one import method only.

## Implemented

- Responsive dashboard with scoped student, drive, application, offer and review workspaces.
- Five roles: administrator, officer, coordinator, recruiter and student. Course/batch, company and student ownership are enforced on the server.
- Student creation, correction, archiving and session registration/academic verification.
- Company/drive/activity management in Payload admin; custom commands for protected transitions.
- Versioned policy configuration, ALLOW/BLOCK/MANUAL_REVIEW explanations, I/F/I+F restrictions, category switching and approved drive-specific exceptions.
- Applications, recruitment stages, campus/off-campus offers, acceptance deadlines, PPO, joining, NOC and reasoned corrections/revocations.
- Attendance with review cases for absence; an administrator explicitly selects excluded drives. Absence never automatically triggers discipline.
- Unique-student placement metrics, separate offer counts, programme/batch/company reporting, annual FTE salary statistics and separate stipend summaries.
- CSV preview/commit (up to 1,000 rows / 2 MB) and scoped student/offer CSV exports with formula neutralization and audited purposes.
- Transactional changes and audits, shared registration revisions for competing commands, immutable approved policies, unique campus offers and idempotent command IDs.
- HMAC-signed append-only audit records, sensitive-read auditing and signed checkpoint/verification utilities.
- Payload-managed password hashing, login lockout, revocable sessions, one-hour tokens, eight-hour session cap, origin checks, bounded command bodies and security headers.

## First session workflow

1. Create student profiles in the workspace; use **Verify registration** to register and verify them for a placement session.
2. In Administration, create users and assign their roles. Link each student user to their student record, each recruiter to their company, and coordinators to the exact course/batch labels they manage. Salary/contact visibility is granted separately.
3. Create companies, drives and activities in Administration. Use INR for money fields and keep annual CTC separate from stipend/payment period.
4. Review the complete institutional guidelines before approving a policy version. Record the approval reference and attach the policy to the placement session. Approved versions cannot be edited.
5. Submit applications. Unresolved cases remain under review. For an exception, an administrator approves specific rule codes, one drive and an expiry. Re-evaluate the application before advancing it.
6. Officers mark applications selected and issue official campus offers. Off-campus offers are recorded as facts and create review cases.
7. Students can respond to their own pending offers before the server-calculated cutoff. Officers manage other lifecycle updates, with reasons for corrections/revocations.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run setup` | Safely create local environment configuration |
| `npm run bootstrap` | Provision the first administrator and draft session |
| `npm run dev -- --webpack` | Local development |
| `npm run typecheck` | TypeScript verification without test files |
| `npm run lint` | ESLint checks |
| `npm run build` | Production compilation |
| `npm run generate:importmap` | Regenerate Payload admin component imports |
| `npm run generate:types` | Generate optional collection interfaces; does not globally override the application's dynamic service types |
| `npm run audit:verify` | Verify signatures on existing audit events |
| `npm run audit:checkpoint` | Write a signed manifest under ignored `.runtime/` |
| `npm run audit:verify -- /path/to/checkpoint.json` | Compare signatures and detect missing/changed anchored events |
| `npm audit --omit=dev` | Check production dependency advisories |

A local audit manifest alone is not deletion-resistant. Copy checkpoints to independently controlled immutable storage using deployment infrastructure. Keep the audit secret available for historical verification and in protected recovery material.

## Verification performed

Type checking, linting, production compilation, local HTTP/browser inspection, and in-memory policy boundary checks have been performed during implementation. The production dependency audit reported zero known vulnerabilities after applying the pinned transitive patches.

Local MongoDB replica-set bootstrap, demo import, demo account login, the student policy-block response, rejection of direct protected writes and audit signature verification have been checked. Atlas connectivity, complete workflow coverage, concurrent database writes and recovery still require environment-specific verification. No test-case files were created.

## Deployment responsibilities and current limits

- Configure Atlas network access, least-privilege database credentials, TLS, encrypted backups and a restore drill before real-data use.
- Configure independent checkpoint retention, operational alerting, and institution-approved data retention. No cloud infrastructure is provisioned by this source delivery.
- The full NFSU guidelines were not provided. Ambiguous policy options default to review. The 24-hour clock currently starts at offer issuance; confirm that interpretation before production.
- Multiple FTE offers require a reviewed baseline exception. Salary/category rules and type restrictions are evaluated together.
- Automatic emails/SMS, institutional SSO/MFA and native Excel files are deferred. The initial login screen directs password assistance to the administrator; no outbound email service is configured.
- An offer past its deadline is treated as closed even if its stored state is still pending; officers can persist the expiry through an explicit command. There is no separate background worker.
- Conflicting concurrent operations return 409 for refresh/retry. Large datasets should move the current small-institution workspace reads to server pagination before expanding usage.
- Checkpoints, restore procedures and retention require deployment execution; signature verification alone does not protect against a compromised application and audit key.
- CSP allows inline styles/scripts for the integrated Next.js/Payload admin. A nonce-based deployment policy can tighten this after integration verification.

[Architecture decision](docs/backend-decision.md) · [Original implementation plan](docs/implementation-plan.md) · [Operations and schema](docs/operations.md)
