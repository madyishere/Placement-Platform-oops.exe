import { config as dotenv } from "dotenv";
import { demoData, relationshipFields } from "./demo-data";
dotenv({ path: ".env.local" });
dotenv();
const data = demoData();
console.table(
  Object.entries(data).map(([collection, rows]) => ({
    collection,
    records: rows.length,
  })),
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Preview only; no database connection or changes. Run npm run demo:import -- --apply to import.",
  );
  process.exit(0);
}
const uri = new URL(process.env.DATABASE_URI || "");
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname)
)
  throw new Error("Demo import is restricted to a local development database.");
const { getPayload, createLocalReq } = await import("payload");
const { default: config } = await import("../src/payload.config");
const { commandContext } = await import("../src/access");
const { audit } = await import("../src/lib/audit");
const payload = await getPayload({ config });
try {
  await Promise.all(
    Object.values(payload.db.collections).map((model) => model.init()),
  );
  const admin = (
    await payload.find({
      collection: "users",
      where: {
        and: [
          { role: { equals: "admin" } },
          { disabled: { not_equals: true } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0];
  if (!admin)
    throw new Error(
      "Run bootstrap first; an enabled administrator is required.",
    );
  const req = await createLocalReq(
    { user: { ...admin, collection: "users" }, context: commandContext() },
    payload,
  );
  const marker = "demo-import:hackathon-v1";
  const previous = await payload.count({
    collection: "audit-events",
    where: { commandID: { equals: marker } },
    overrideAccess: true,
  });
  if (previous.totalDocs) {
    console.log("Demo dataset already imported. Nothing changed.");
  } else {
    const existing = await payload.count({
      collection: "students",
      where: { placementID: { in: data.students.map((s) => s.placementID) } },
      overrideAccess: true,
    });
    if (existing.totalDocs)
      throw new Error(
        "Demo student IDs already exist, possibly from CSV/Compass. Refusing to mix import methods.",
      );
    const transaction = await payload.db.beginTransaction();
    if (!transaction) throw new Error("A replica set is required.");
    req.transactionID = transaction;
    try {
      const ids = new Map<string, string>();
      for (const [collection, rows] of Object.entries(data))
        for (const row of rows) {
          const {
            id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...fields
          } = row;
          void _createdAt;
          void _updatedAt;
          for (const field of relationshipFields)
            if (fields[field]) {
              const linked = ids.get(String(fields[field]));
              if (!linked)
                throw new Error(
                  `Unresolved relationship ${collection}.${field}`,
                );
              fields[field] = linked;
            }
          if (collection === "registrations")
            fields.key = `${fields.student}:${fields.session}`;
          if (collection === "applications")
            fields.key = `${fields.student}:${fields.drive}`;
          if (collection === "attendance")
            fields.key = `${fields.student}:${fields.activity}`;
          if (collection === "offers")
            fields.campusKey = `${fields.student}:${fields.drive}`;
          const created = await payload.create({
            collection,
            data: fields,
            overrideAccess: false,
            depth: 0,
            req,
          });
          ids.set(id, String(created.id));
        }
      await audit(
        req,
        "demo.import",
        "hackathon-v1",
        {
          fictional: true,
          records: Object.values(data).reduce(
            (sum, rows) => sum + rows.length,
            0,
          ),
        },
        marker,
      );
      await payload.db.commitTransaction(transaction);
      console.log(
        "Demo imported successfully. Select DEMO · Hackathon placement season in the workspace.",
      );
    } catch (error) {
      await payload.db.rollbackTransaction(transaction);
      throw error;
    }
  }
} finally {
  await payload.destroy();
}
