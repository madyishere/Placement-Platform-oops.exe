# Hackathon demonstration dataset

For the complete chronological presentation with role switching and the prepared accounts, use [FULL-WALKTHROUGH.md](FULL-WALKTHROUGH.md). Passwords are in the ignored local `.runtime/demo-credentials.md` file.

152 fictional records across 11 collections: 30 students, 30 registrations, 8 companies, 10 drives, 30 applications, 15 offers, 4 activities, 20 attendance records, 3 pending reviews, one policy and one placement session. All people and employers are synthetic; email and website addresses use reserved `.example` domains. No passwords, user accounts, personal phone numbers or audit signatures are included in the files.

## Recommended: audited application import

Keep Docker Desktop and `placement-mongo` running. From the project directory:

```powershell
npm run demo:import
npm run demo:import -- --apply
```

The first command previews counts without connecting to MongoDB. The second imports into the **local database configured in `.env.local`**, using the existing enabled administrator. It runs Payload validation/access hooks, remaps relationships, creates real signed audit events and commits the dataset in one transaction. It refuses production/remote databases, preserves existing records, and skips a repeated successful import. It refuses overlapping demo student IDs from another import method. No authentication credentials are changed.

Dates are generated relative to import time: open drives stay open for 30 days, the demo session for 180 days, and two pending offers remain actionable for approximately 21.6 hours. Re-running an already completed import does not reset deadlines or overwrite records.

Sign in with your existing administrator account and select **DEMO · Hackathon placement season** in the session selector. The demo policy is marked approved solely to exercise the policy engine; its approval reference explicitly identifies it as a simulation, not institutional approval. The bootstrap policy remains untouched.

## Alternative: MongoDB Compass JSON import

Use this method only in a disposable demo database with the application's collections/indexes already initialized. Direct database imports bypass application validation and audit hooks. They cannot demonstrate signed creation auditing; prefer the command above for that feature. Do not combine import methods.

Connect Compass to `mongodb://127.0.0.1:27018/placement?replicaSet=rs0&directConnection=true`. Select the intended database, then **Add Data → Import JSON or CSV** in each collection. Choose the matching JSON file under `collections/` in this order:

1. `policy-versions`
2. `placement-sessions`
3. `students`
4. `companies`
5. `drives`
6. `registrations`
7. `applications`
8. `offers`
9. `activities`
10. `attendance`
11. `review-cases`

Each file is a JSON array using MongoDB Extended JSON (`$oid` relationships and `$date` dates). Preserve the supplied IDs and field types. Use the exact collection names above. Import once; duplicate IDs are intentionally not upserted. JSON imports are separate operations, so a partial import is not atomic.

Run `npm run demo:export` before a later presentation to regenerate the files with fresh dates. This changes files only; it does not update already imported records.

## Student CSV only

`students.csv` is compatible with the application's CSV preview/import screen. This imports only student profiles, not registrations, offers or the dashboard dataset. Use it instead of the full dataset when demonstrating the CSV workflow in a separate clean demo database; importing it after the full dataset produces duplicate Placement IDs.

## Five-minute presentation

1. **Dashboard:** show 30 profiles, 29 registrations, 25 eligible students, 10 uniquely placed students and 15 total offers. Explain why offer count differs from placed-student count.
2. **Reports:** initial accepted offers produce 6 FTE-only students, 3 internship-only students and 1 combined placement. Salary sample is 7 students, highest annual CTC ₹18 LPA, median ₹12 LPA and mean ₹11 LPA. Pending PPO CTC is excluded; confirmed combined FTE is included.
3. **Policy evaluation:** Aarav (`DEMO-2027-001`) holds ₹8 LPA category B. Applying to Junior Analyst at ₹9 LPA is blocked; ML Engineer at ₹12 LPA meets the 1.5× rule. Diya (`002`) can move from category A to Threat Researcher at A+. Kabir (`003`) already holds A+ and is blocked from another company.
4. **Human review:** Riya (`026`) has pending verification and an application to the drive with unknown CTC. Show the review explanation. Kunal (`027`) also needs verification; Pranav (`029`) is ineligible; Leela (`030`) is not registered.
5. **Offer lifecycle:** Arjun (`011`) has a pending internship/PPO offer; Tara (`012`) has pending internship/confirmed FTE. Accept one, then show the updated dashboard. Reyansh (`015`) has an overdue pending offer; persist its expiry.
6. **Attendance and audit:** Dev (`017`) and Myra (`018`) have pending absence reviews with no automatic sanction. Review one, then inspect the audit trail. With the recommended importer, run `npm run audit:verify` to verify event signatures.

Student/recruiter/coordinator logins are not seeded. To show role scoping, create users through Administration and link them to these student/company records. Use your own strong passwords; never publish them with the dataset.

No test-case files are supplied.
