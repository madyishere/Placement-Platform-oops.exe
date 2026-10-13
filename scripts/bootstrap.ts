import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" });
dotenv();
const email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 14)
  throw new Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 14 characters) in .env.local.",
  );
if (!process.env.DATABASE_URI)
  throw new Error("Set DATABASE_URI to MongoDB Atlas or a local replica set first.");
const { getPayload, createLocalReq } = await import("payload");
const { default: config } = await import("../src/payload.config");
const payload = await getPayload({ config });
// Finish first-run collection/index creation before opening a transaction.
await Promise.all(
  Object.values(payload.db.collections).map((model) => model.init()),
);
const users = await payload.count({
  collection: "users",
  overrideAccess: true,
});
if (users.totalDocs)
  throw new Error(
    "Bootstrap refused: user accounts already exist. Use an administrator account.",
  );
const { commandContext } = await import("../src/access/index");
const req = await createLocalReq(
  { context: { ...commandContext(), bootstrap: true } },
  payload,
);
const transaction = await payload.db.beginTransaction();
if (!transaction)
  throw new Error("MongoDB replica-set transactions are required.");
req.transactionID = transaction;
try {
  const admin = await payload.create({
    collection: "users",
    data: {
      name: "Placement Administrator",
      email,
      password,
      role: "admin",
      canViewContacts: true,
      canViewSalary: true,
    },
    overrideAccess: true,
    req,
  });
  req.user = { ...admin, collection: "users" };
  const policy = await payload.create({
    collection: "policy-versions",
    data: {
      name: "2026–27 · pending institutional approval",
      approved: false,
      bMin: 600000,
      aMin: 1000000,
      plusMin: 1600000,
      selectionBasis: "review",
      fSwitch: "review",
      offCampus: "review",
      cSwitch: "review",
      sameCompany: "review",
      notes:
        "Proposed interpretation only. Approve after reviewing the complete institutional guidelines.",
    },
    overrideAccess: false,
    req,
  });
  await payload.create({
    collection: "placement-sessions",
    data: {
      name: "2026–27",
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2027-06-30T23:59:59.000Z",
      policy: policy.id,
    },
    overrideAccess: false,
    req,
  });
  await payload.db.commitTransaction(transaction);
  console.log(
    "Administrator, draft policy and placement session created. Sign in at /login. Remove ADMIN_PASSWORD from .env.local.",
  );
} catch (e) {
  await payload.db.rollbackTransaction(transaction);
  throw e;
}
await payload.destroy();
