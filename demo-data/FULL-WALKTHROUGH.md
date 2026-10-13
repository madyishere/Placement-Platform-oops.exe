# Hackathon presentation: complete placement workflow

Allow 30–40 minutes for the complete walkthrough or use steps 1–10 for a shorter presentation. This is a fictional demonstration, not official NFSU policy. Follow the order: changing an offer or approving an exception affects later eligibility.

## Preparation and accounts

1. Keep Docker Desktop running. If needed: `docker start placement-mongo`.
2. Run `npm run dev -- --webpack`; open http://localhost:3000/login.
3. Open [.runtime/demo-credentials.md](../.runtime/demo-credentials.md) locally for passwords. Do not put that file on a presentation slide or commit it. Use your original bootstrap credentials for admin.
4. Select **DEMO · Hackathon placement season** after each login. Sign out before switching roles; tabs in one browser profile share login cookies. Separate browser profiles can keep different roles open.
5. Use search to find the exact student/drive below. Tables show only a page of records; use pagination where necessary.

| Login | Role and purpose |
|---|---|
| Your bootstrap administrator | Users, policy approval, review decisions, audit |
| officer@placement-demo.example | Placement operations and final offer updates |
| coordinator@placement-demo.example | M.Tech. CS scope, restricted salary/contact visibility |
| recruiter@placement-demo.example | Demo CipherNest only; offer proposals |
| journey@placement-demo.example | Fresh main journey, DEMO-LIVE-031 |
| student@placement-demo.example | Aarav, DEMO-2027-001; B-category restriction and exception |
| aplus@placement-demo.example | Kabir, DEMO-2027-003; A+ exit restriction |
| ppo-student@placement-demo.example | Arjun, DEMO-2027-011; alternate existing PPO scenario |
| decline@placement-demo.example | Tara, DEMO-2027-012; decline a pending offer |

**Already prepared:** 30 baseline students plus the new Journey student, whose registration is pending academic verification (CGPA 8.4, zero backlogs). Three additional accounts above were created alongside the five earlier demo accounts. The main Journey student has no offers or applications, so this flow starts clean. Existing students may have been changed during earlier rehearsals; check current state rather than assuming every baseline number remains unchanged.

**Not prepared in advance:** the live drive, its applications and its offer. Create these on screen below. The steps deliberately demonstrate real transitions, rather than pre-completing them.

## 1. Administrator: introduce the dashboard and controls

Sign in as admin and select the demo season.

- Open **Overview**. Explain unique placed students versus total offers and the pending-verification/review counts. With only the original import plus Journey preparation, there are 31 profiles, 30 registered and 10 placed; later actions change those figures.
- Open **Policy** and show the approved demo policy, category thresholds and configurable interpretations. The approval reference says it is a simulation.
- Open **Administration → Users**. Show roles and the fields linking a student to a profile, a recruiter to a company, and a coordinator to courses/batches. Do not expose passwords.

Say: “The same application presents different records and actions according to the signed-in role. Policy decisions are evaluated on the server.”

## 2. Coordinator: directory, academic verification and CSV

Sign in as **coordinator**.

1. Open **Student directory**. Only M.Tech. CS profiles should be visible, including Demo Journey Student. Salary and contact visibility are not granted to this account.
2. Find `DEMO-LIVE-031`. Open **Verify registration**. Select the demo session, `registered`, `eligible`, CGPA `8.4`, backlogs `0`; enter “Academic record verified for fictional hackathon demonstration.” Save.
3. Show that the registration is now eligible. This is the prerequisite for the main application.
4. Demonstrate CSV import using [live-import.csv](live-import.csv), not the original already-imported `students.csv`. Open the CSV import page, select the file, preview both rows, then commit. Both rows are M.Tech. CS and fit this coordinator's scope. This creates profiles only; they are not automatically registered or academically verified.
5. Preview the same file again if you want to explain duplicates, but avoid committing it again. Database uniqueness prevents duplicate Placement IDs; preview validates row format, while existing-record collisions are reported at commit.

Say: “A valid student profile is separate from a verified placement registration.”

## 3. Officer: create the live recruitment opportunity

Sign in as **officer**. Use **Administration** to manage reference data.

In **Drives**, create:

| Field | Value |
|---|---|
| Title | LIVE DEMO · CipherNest Security Internship + PPO |
| Company | Demo CipherNest |
| Session | DEMO · Hackathon placement season |
| Type | IF |
| Status | open |
| Annual CTC | 1200000 |
| Stipend | 30000 |
| Stipend period | monthly |
| Courses | M.Tech. CS |
| Minimum CGPA | 7 |
| Maximum backlogs | 0 |
| Deadline | Seven days in the future |
| Notes | Fictional opportunity for the chronological demo. |

In **Activities**, create two records linked to that drive:

- `LIVE DEMO · Security aptitude round`, type `test`, a time earlier today.
- `LIVE DEMO · Interview briefing`, type `talk`, a time earlier today.

Return to the workspace or reload it to fetch the records. Payload administration changes do not automatically refresh an already-open workspace.

## 4. Student: apply successfully

Sign in as **journey**.

1. Open **My profile** and show the student’s own record and verified registration.
2. Open **Recruitment drives**, find the live CipherNest drive and click **Apply**.
3. Confirm the **Check eligibility & apply** form. Expect `ALLOW`, a visible notification and a submitted application under **Applications**.
4. Point out that this account cannot choose another student or issue an official offer.

Say: “Registration, academics, drive deadline and placement policy are checked together before an application is created.”

## 5. Recruiter: company scope and offer proposal

Sign in as **recruiter**.

1. Show that only Demo CipherNest drives and shared applications appear.
2. Open **Applications** and locate Demo Journey Student on the live drive.
3. Use **Request a review** from the review workspace. Select Demo Journey Student, the demo session and the live drive; choose `offer-proposal`. Notes: “Recommend this candidate after assessment; proposed annual CTC INR 1200000 and monthly stipend INR 30000.”
4. Save and show the pending proposal. The recruiter does not directly select candidates or issue official offers.

This account does not get the full student directory, other companies' applications or confidential offer records.

## 6. Officer: shortlist, attendance and selection

Sign in as **officer**.

1. In **Applications**, update Journey’s live application to `shortlisted`; enter a reason.
2. In **Attendance → Record attendance**, select Journey and `LIVE DEMO · Security aptitude round`, choose `present` and enter a note. Save.
3. Record Journey as `absent` for `LIVE DEMO · Interview briefing`, with “Absence recorded; explanation requested.” This creates a pending absence review; it does not automatically exclude the student.
4. Return to **Applications**, update the live application to `selected`, and enter “Assessment complete; placement officer confirms selection.” Policy checks run again.

## 7. Administrator: human review without automatic approval side effects

Sign in as **admin**, open **Reviews**.

1. Resolve the recruiter’s `offer-proposal` as `approved`, noting “Proposal reviewed; officer must issue the official offer.” Leave exception codes and excluded drives empty. Approving this review does **not** automatically create an offer.
2. Resolve Journey’s absence review as `rejected`, noting “Documented explanation accepted; no exclusion imposed.” Leave exception codes and excluded drives empty. This rejects a sanction, rather than silently rewriting attendance.
3. Show the recorded decision in the review list/audit trail.

## 8. Officer: issue the offer

Sign in as **officer**, open **Offers & outcomes → Record an offer**.

| Field | Value |
|---|---|
| Student | Demo Journey Student |
| Placement session | Demo season |
| Company | Demo CipherNest |
| Source | campus |
| Recruitment drive | LIVE DEMO · CipherNest Security Internship + PPO |
| Offer type | IF |
| Combined offer outcome | PPO pending |
| Annual CTC | 1200000 |
| Stipend / period | 30000 / monthly |
| Issued at | Current local time or one minute earlier |
| Company deadline | Leave blank unless demonstrating an earlier cutoff |
| Notes | Fictional official offer after selection. |

Save. Show `pending` acceptance and the response deadline. The server caps the response window at 24 hours after issuance and uses an earlier company deadline when supplied. Campus company/session/type/CTC must match the selected application and drive.

## 9. Student: accept and request a correction

Sign in as **journey**.

1. In **Offers & outcomes**, update the live offer using `accept`. Expect accepted status.
2. Show that the student is now placed through an internship, while a pending PPO does not yet count as confirmed FTE salary.
3. In **My profile**, use **Request correction**, select review type `contact-correction` and the demo session, and leave the optional drive blank. Request: “Please change my demo contact email to journey.updated@placement-demo.example.” Do not enter a real phone number.

Sign in as **admin**, approve that `contact-correction` review with a reason. Approval records the review decision; it does not apply the profile edit. As **officer**, use **Edit** on Journey’s profile and apply the email change with a correction reason. The linked login email remains `journey@placement-demo.example`; profile contacts and account credentials are separate.

## 10. Officer: PPO, NOC and joining

Sign in as **officer** and update Journey’s accepted live offer in this order:

1. `ppo-offered`: the company has issued a PPO.
2. `ppo-accepted`: the confirmed ₹12 LPA CTC is now counted as FTE compensation. Students do not perform the PPO confirmation transitions in this implementation.
3. `noc-approved`: combined offers start with a pending NOC. Show the approved state.
4. `join`: show joined status. Only accepted offers can update joining.

Open **Reports & insights**: Journey now contributes to combined internship + FTE outcomes. Salaries are annual INR; monthly stipend remains a separate measure. The report uses each placed student's highest accepted confirmed FTE package, not the sum of all their offers.

## 11. Student: explain a blocked policy decision

Sign in as **student** (Aarav).

1. Confirm the existing ₹8 LPA offer under **Offers & outcomes**.
2. Apply to `DEMO · Junior Analyst · Category B` at ₹9 LPA.
3. Expect a red, persistent notification: “The new CTC must be at least 1.5 times the current CTC.” No new application is created for a blocked attempt; it is audited.
4. Explain that ₹8 LPA × 1.5 = ₹12 LPA. Do not accept a different offer before this step.

Sign in as **aplus** (Kabir), apply to `DEMO · ML Engineer · Category A` at another company. Expect the A+ exit restriction. This is a separate case from Aarav’s multiplier rule.

## 12. Administrator: a narrowly scoped policy exception

Return to **student** (Aarav), request an `exception` review for the Junior Analyst drive. Notes: “Fictional documented exception requested for this drive only.”

As **admin**, resolve this review:

- Decision: `approved`.
- Exception rule codes: `B_MULTIPLIER`.
- Excluded drive IDs: empty.
- Expiry: tomorrow.
- Notes: “Demo-only approved multiplier exception for this one drive.”

As **student**, apply to Junior Analyst again. Expect the named rule to be overridden for that drive while other checks still run. A policy exception cannot bypass registration, academic eligibility, drive dates or an unapproved policy. If you already completed this step during a rehearsal, do not repeat the application; show the existing result.

## 13. Verification and unknown-CTC review

As **officer**, open the seeded application for Riya Dutta (`DEMO-2027-026`) to `DEMO · Security Engineer · CTC awaiting confirmation`.

- Show its manual-review explanation: pending verification and unknown CTC.
- Verify Riya’s academic registration through **Student directory**.
- In Administration edit that drive, entering confirmed annual CTC `1100000` with a supporting note.
- Reload the workspace. Update the existing application to `shortlisted`, which re-evaluates eligibility. Do not create a duplicate application to the same drive.
- As admin, resolve the associated policy-conflict review with a note recording the correction. Resolving a review alone does not fill in academic or compensation data.

## 14. Alternate offer and application endings

These are separate records so the main Journey stays intact.

| Feature | Account and steps | Expected result |
|---|---|---|
| Decline | Sign in as **decline** (Tara); decline the seeded pending combined offer before its deadline | Acceptance becomes declined; it does not increase placed count |
| Deadline enforcement | Officer: find Reyansh Roy (`015`), whose pending offer is already overdue; try accept, then use `expire` | Late acceptance denied; expiry can be persisted |
| PPO declined | Officer: Ishaan Nair (`005`) has an accepted combined offer with pending PPO. Use `ppo-offered`, then `ppo-declined` | Internship remains, unconfirmed FTE excluded |
| Not joined | Officer: on an accepted seeded offer, use `not-joined` with a reason | Joining state changes; distinguish acceptance from joining |
| Correction | Officer: correct annual CTC on a selected seeded FTE offer with a reason; leave unrelated fields blank | Revised amount and audit history; recalculated report |
| Revocation | Officer: revoke a seeded offer with a reason, at the end of the demo | Revoked offer excluded from accepted-outcome totals |
| Application withdrawal | Aarav: withdraw the Junior Analyst application created in step 12, with a note | Withdrawn application; no offer created |
| Application rejection | Officer: choose a different submitted/shortlisted baseline application and mark rejected | Final rejected state; reason audited |

Seeded pending offers expire approximately 21.6 hours after import. If Tara’s deadline has passed, show deadline enforcement instead; to demonstrate a fresh decline, issue a new offer through a new eligible drive/application. Do not edit deadlines directly to bypass the workflow.

For a **student-initiated NOC request**, use Aarav’s original FTE offer while it is still accepted and NOC is `not-applicable`: student chooses `noc-request`, officer chooses `noc-rejected`, student can request again, then officer chooses `noc-approved`. Do this before revoking that offer.

## 15. Attendance sanctions, limited to named drives

As admin, use one of the pending seeded absence reviews for Dev (`017`) or Myra (`018`). Copy an open drive ID from its Administration record URL. Approve the review with that ID under **Excluded drive IDs**, leave rule codes empty, enter a reason and a future expiry. Maximum three drives can be named.

As officer, apply on behalf of that student to the excluded drive. Expect `EXCLUDED_DRIVE` (possibly alongside another relevant policy reason). Approval affects the named drives, not every recruitment opportunity. Return to the review to show the precise scope and decision.

## 16. Off-campus facts and review

As officer, record an offer for a registered demo student with source `off-campus`, no recruitment drive, type `F`, annual CTC `650000`, issued now, company chosen from the list, and explanatory notes. Keep the demo session selected.

Show that recording a fact does not claim it is a campus placement authorization: the workflow creates a policy-conflict review. The demo policy treats off-campus eligibility interaction as reviewable. Use the seeded data as the before state and show the changed review count.

## 17. Reference data and policy versioning

As admin:

1. Create a fictional company `LIVE DEMO · EvidenceWorks` in Administration, industry `Digital Forensics`, website `https://evidenceworks.example`.
2. Create a draft drive for it, then publish it by changing status to `open` with a future deadline. Later set it to `closed`; closed participation is rejected server-side.
3. Create a **new** policy version named `LIVE DEMO · next policy draft`, with thresholds `600000`, `1000000`, `1600000`. Set interpretation options deliberately and leave approval false.
4. Demonstrate approval by adding `DEMO-ONLY-APPROVAL` as reference and setting approved true. Approved versions cannot be edited; create a new version for future changes.
5. Create a separate session `LIVE DEMO · next season` with a current start date, future end date and the new policy. Do not switch the original demo session’s policy during the main journey.
6. Return to the original demo season to continue reporting. Session selection separates drives, registrations, offers and applications; the student directory itself spans sessions.

## 18. Student maintenance, archive and user management

As officer, add `DEMO-LIVE-032`, name `Demo Archive Student`, email `archive@placement-demo.example`, programme M.Tech. CS, batch `2025–2027`, mobile blank. Edit a field with a reason, archive with a reason, and restore. Archive is a reversible business state, not deletion.

As admin, demonstrate creating an additional user through **Administration → Users**, linking an appropriate role/profile/company and using a unique strong password. Do not reuse a sample password. Show the disabled flag on a non-presenting account and explain that disabled users lose access. Keep the presenting administrator enabled.

## 19. Reporting, exports and audit: close the presentation

As officer, show **Reports & insights**:

- Programme and batch outcomes, company offer counts, registered/eligible/unplaced totals.
- Internship, FTE and combined distinctions; highest/average/median confirmed annual salary.
- Stipend summaries separated by payment period.
- Export students/offers with a purpose such as “Fictional hackathon demonstration.” Open the CSV to show the columns.

As coordinator, show the restricted course scope again. This account cannot export offer compensation because salary access is disabled.

As admin, open **Audit**: find changes from the main journey, the blocked attempts, offer updates and exports. The current interface displays the most recent 100 events; a busy rehearsal may push earlier entries out of that view. For integrity verification run:

```powershell
npm run audit:verify
npm run audit:checkpoint
```

Verification checks signatures; an independently retained checkpoint helps detect deletion. This demo does not provision immutable external storage. Do not claim login MFA, automated email/SMS, scheduled expiry workers or production recovery have been implemented.

Closing line: “We demonstrated a complete placement journey, explicit policy explanations, human-reviewed exceptions, scoped access, offer lifecycle tracking and an auditable record of changes.”

## Rehearsal and troubleshooting

- Complete the baseline/main journey only once per record. Applications are unique per student and drive; final application states cannot be repeatedly advanced.
- After reference changes in Administration, reload the workspace. After a stale-record conflict, refresh before retrying.
- A BLOCK notification is a successful policy evaluation, not a network error. It stays visible until dismissed; MANUAL REVIEW is distinct from successful authorization.
- This guide describes supported workflows; every branch has not been executed on your behalf because doing so would consume the demo states. Accounts and Journey preparation are complete; the presentation actions remain for you.
- For another full rehearsal, use a new Journey student and a new drive. Do not delete records or re-run bootstrap against the populated database.
- No test-case files were created. Passwords remain only in the ignored local credentials file.
