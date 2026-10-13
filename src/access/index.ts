import type { Access, FieldAccess, PayloadRequest, Where } from "payload";
import { type Actor, idOf, isManager, isStaff } from "@/lib/domain";
import { sessionAllowed } from "@/lib/session";

// Route handlers and Payload config can load separate bundles of this module.
// A registry symbol keeps the server-only capability stable across those bundles
// and development reloads. JSON request bodies cannot supply a Symbol value.
const commandToken = Symbol.for("placement.server-command");
export function commandContext() {
  return { placementCommand: commandToken };
}
export const trusted = (req: PayloadRequest) =>
  req.context?.placementCommand === commandToken;
export const actor = (req: PayloadRequest) =>
  sessionAllowed(req) ? (req.user as unknown as Actor) : null;
export const authenticated: Access = ({ req }) => !!actor(req);
export const administrator: Access = ({ req }) =>
  actor(req)?.role === "admin" && !actor(req)?.disabled;
export const managers: Access = ({ req }) => isManager(actor(req));
export const staff: Access = ({ req }) => isStaff(actor(req));
export const commandOnly: Access = ({ req }) => trusted(req) && !!actor(req);
export const adminField: FieldAccess = ({ req }) =>
  actor(req)?.role === "admin" && !actor(req)?.disabled;
export const salaryField: FieldAccess = ({ req }) => {
  const u = actor(req);
  return (
    !!u &&
    !u.disabled &&
    (isManager(u) || !!u.canViewSalary || u.role === "student")
  );
};
export const contactField: FieldAccess = ({ req }) => {
  const u = actor(req);
  return (
    !!u &&
    !u.disabled &&
    (isManager(u) || !!u.canViewContacts || u.role === "student")
  );
};
export function courseScope(u: Actor): Where {
  return {
    and: [
      { course: { in: u.courses || [] } },
      ...(u.batches?.length ? [{ batch: { in: u.batches } }] : []),
    ],
  };
}
export const studentAccess: Access = ({ req }) => {
  const u = actor(req);
  if (!u || u.disabled) return false;
  if (isManager(u)) return true;
  if (u.role === "coordinator") return courseScope(u);
  if (u.role === "student")
    return { id: { equals: idOf(u.student) || "000000000000000000000000" } };
  return false;
};
export const studentRelated: Access = async ({ req }) => {
  const u = actor(req);
  if (!u || u.disabled) return false;
  if (isManager(u)) return true;
  if (u.role === "student")
    return {
      student: { equals: idOf(u.student) || "000000000000000000000000" },
    };
  if (u.role === "coordinator") {
    const students = await req.payload.find({
      collection: "students",
      where: courseScope(u),
      select: { id: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    });
    return { student: { in: students.docs.map((d) => d.id) } };
  }
  return false;
};
export const driveAccess: Access = ({ req }): boolean | Where => {
  const u = actor(req);
  if (!u || u.disabled) return false;
  if (isStaff(u)) return true;
  if (u.role === "recruiter")
    return {
      company: { equals: idOf(u.company) || "000000000000000000000000" },
    };
  return { status: { in: ["open", "closed"] } };
};
