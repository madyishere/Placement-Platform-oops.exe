import { config as dotenv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
dotenv({ path: ".env.local" });
dotenv();
const { getPayload } = await import("payload");
const { default: config } = await import("../src/payload.config");
const { signature } = await import("../src/lib/audit");
const payload = await getPayload({ config });
const records = await payload.find({
  collection: "audit-events",
  pagination: false,
  depth: 0,
  sort: "id",
  overrideAccess: true,
});
const manifest = {
  createdAt: new Date().toISOString(),
  entries: records.docs.map((d) => ({
    id: String(d.id),
    signature: String(d.signature),
  })),
};
await mkdir(".runtime", { recursive: true });
const path = `.runtime/audit-checkpoint-${Date.now()}.json`;
await writeFile(
  path,
  JSON.stringify({ ...manifest, signature: signature(manifest) }, null, 2),
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Saved signed checkpoint: ${path}. Copy it to independently controlled immutable storage. Local storage alone does not protect against deletion.`,
);
await payload.destroy();
