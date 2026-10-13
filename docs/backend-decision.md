# Architecture decision: Next.js + Payload + MongoDB

**Status:** selected by the user. **Date:** 13 October 2026.

Use one TypeScript Next.js application containing Payload, connected through Payload's MongoDB adapter to a MongoDB replica set. This replaces the earlier MERN/Express recommendation.

| Responsibility | Owner |
|---|---|
| Student/recruiter screens and custom dashboard | Next.js App Router |
| Authentication, schemas, access rules and routine staff CRUD | Payload and its admin UI |
| Applications, offers, review, reports and CSV | Small server-only TypeScript services |
| Policy evaluation | Pure TypeScript functions with typed configuration |
| Persistence and atomic audited changes | Payload Local API + MongoDB transactions |
| TLS, encryption, backups and audit checkpoints | Deployment infrastructure |

Payload installs inside Next.js, avoiding the extra Express service and identity adapter from the earlier plan. See [installation](https://payloadcms.com/docs/getting-started/installation).

Use one identity source, one origin and one deployment. Reuse Payload admin screens before building equivalents. Do not add separate Mongoose models, Auth.js, a generic repository framework, Redis, microservices or a standalone worker without a demonstrated requirement.

Define explicit role/course/company/owner access, protect confidential fields and route sensitive transitions through validated server commands. Explicitly pass authenticated context and `overrideAccess: false` on user-driven Local API calls. Published and main-branch documentation differ on defaults across releases; avoid depending on that default. [Published access behavior](https://payloadcms.com/docs/local-api/access-control), [repository documentation](https://github.com/payloadcms/payload/blob/main/docs/local-api/access-control.mdx).

Use transactions for business changes and audits, propagating request context to nested calls. Require a MongoDB replica set and prove rollback and conflicting-command handling in the first milestone. [Payload transactions](https://payloadcms.com/docs/database/transactions).

The detailed scope, schema, policy questions, security requirements, milestones and acceptance tests are in [the implementation plan](implementation-plan.md). No alternate backend or parallel implementation is planned.
