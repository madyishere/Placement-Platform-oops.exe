import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" });
dotenv();
const { getPayload } = await import("payload");
const { default: config } = await import("../src/payload.config");
const { signature } = await import("../src/lib/audit");
const { timingSafeEqual } = await import("node:crypto");
const { readFile } = await import("node:fs/promises");
const payload = await getPayload({ config });
const records = await payload.find({
  collection: "audit-events",
  pagination: false,
  depth: 0,
  overrideAccess: true,
});
let invalid = 0;
for (const doc of records.docs) {
  const event = {
    actor: doc.actor,
    action: doc.action,
    target: doc.target,
    at: doc.at,
    requestID: doc.requestID,
    details: doc.details,
    ...(doc.commandID ? { commandID: doc.commandID } : {}),
  };
  const expected = Buffer.from(signature(event)),
    actual = Buffer.from(String(doc.signature));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    invalid++;
}
let missingOrChanged = 0;
if (process.argv[2]) {
  const { signature: supplied, ...manifest } = JSON.parse(
    await readFile(process.argv[2], "utf8"),
  );
  const expected = Buffer.from(signature(manifest)),
    actual = Buffer.from(String(supplied));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("Checkpoint signature is invalid.");
  const current = new Map(
    records.docs.map((d) => [String(d.id), String(d.signature)]),
  );
  for (const entry of manifest.entries)
    if (current.get(entry.id) !== entry.signature) missingOrChanged++;
}
console.log(
  JSON.stringify({
    records: records.totalDocs,
    invalid,
    checkpointCompared: !!process.argv[2],
    missingOrChanged,
    note: "Signature verification detects modifications, not deletion. Compare a separately retained checkpoint manifest for deletion detection.",
  }),
);
await payload.destroy();
if (invalid || missingOrChanged) process.exitCode = 1;
