import { createHmac, randomUUID } from "node:crypto";
import type {
  PayloadRequest,
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
} from "payload";
import { actor } from "@/access";
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
export function signature(value: unknown) {
  const key = process.env.AUDIT_SECRET;
  if (!key || key.length < 32)
    throw new Error("AUDIT_SECRET must contain at least 32 characters");
  return createHmac("sha256", key).update(canonical(value)).digest("hex");
}
const hidden = /password|salt|hash|token|sessions|email|mobile/i;
function safe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => !hidden.test(key) && item !== undefined)
        .map(([key, item]) => [key, safe(item)]),
    );
  return value;
}
export async function audit(
  req: PayloadRequest,
  action: string,
  target: string,
  details: unknown = {},
  commandID?: string,
) {
  const event = {
    actor: actor(req)?.id || "system",
    action,
    target,
    at: new Date().toISOString(),
    requestID: randomUUID(),
    details: safe(details),
    ...(commandID ? { commandID } : {}),
  };
  return req.payload.create({
    collection: "audit-events",
    data: { ...event, signature: signature(event) },
    overrideAccess: true,
    depth: 0,
    req,
  });
}
export const auditChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  collection,
}) => {
  await audit(req, `${collection.slug}.${operation}`, String(doc.id), {
    before: previousDoc || null,
    after: doc,
  });
  return doc;
};
const disclosureQueues = new WeakMap<PayloadRequest, Promise<void>>();
export const auditRead: CollectionAfterReadHook = async ({
  doc,
  req,
  collection,
}) => {
  if (actor(req) && (doc.email || doc.mobile || typeof doc.ctc === "number")) {
    // Payload reads rows concurrently. Serialize audit writes on this request
    // so they cannot race on a shared MongoDB transaction/session.
    const previous = disclosureQueues.get(req) || Promise.resolve();
    const next = previous.then(async () => {
      await audit(req, `${collection.slug}.read`, String(doc.id), {
        fields: ["email", "mobile", "ctc"].filter((k) => doc[k] != null),
      });
    });
    disclosureQueues.set(req, next);
    try {
      await next;
    } finally {
      if (disclosureQueues.get(req) === next) disclosureQueues.delete(req);
    }
  }
  return doc;
};
