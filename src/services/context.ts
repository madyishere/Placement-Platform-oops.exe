import { getPayload, createLocalReq, type PayloadRequest } from "payload";
import config from "@payload-config";
import { headers } from "next/headers";
import { type Actor, AppError } from "@/lib/domain";
import { commandContext } from "@/access";
import { sessionAllowed } from "@/lib/session";

export function configured() {
  return (
    !!process.env.DATABASE_URI &&
    (process.env.PAYLOAD_SECRET?.length || 0) >= 32 &&
    (process.env.AUDIT_SECRET?.length || 0) >= 32
  );
}
export async function context(request?: Request) {
  if (!configured())
    throw new AppError(
      503,
      "Configure MongoDB and the application secrets to enable placement records.",
    );
  const payload = await getPayload({ config });
  const h = request?.headers || (await headers());
  const { user } = await payload.auth({ headers: h });
  if (!user || !sessionAllowed({ user }))
    throw new AppError(401, "Please sign in to continue.");
  const req = await createLocalReq(
    { user, context: commandContext() },
    payload,
  );
  return { payload, user: user as unknown as Actor, req };
}
export function checkOrigin(request: Request) {
  const expected = new URL(
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
  ).origin;
  if (request.headers.get("origin") !== expected)
    throw new AppError(403, "The request origin is not allowed.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "JSON content is required.");
}
export async function transaction<T>(
  req: PayloadRequest,
  fn: () => Promise<T>,
) {
  const id = await req.payload.db.beginTransaction();
  if (!id)
    throw new AppError(503, "MongoDB replica-set transactions are required.");
  req.transactionID = id;
  try {
    const result = await fn();
    await req.payload.db.commitTransaction(id);
    return result;
  } catch (error) {
    await req.payload.db.rollbackTransaction(id);
    throw error;
  } finally {
    delete req.transactionID;
  }
}
