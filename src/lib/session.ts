import type { PayloadRequest } from "payload";
/** A refresh may renew the one-hour token but cannot extend an eight-hour login. */
export function sessionAllowed(req: Pick<PayloadRequest, "user">) {
  const user = req.user;
  if (!user || user.disabled) return false;
  if (!user._sid) return user._strategy == null; // server-only bootstrap/service context
  const session = user.sessions?.find(
    (s: { id: string }) => s.id === user._sid,
  );
  return (
    !!session &&
    Date.now() - new Date(session.createdAt).getTime() < 8 * 60 * 60 * 1000 &&
    new Date(session.expiresAt).getTime() > Date.now()
  );
}
