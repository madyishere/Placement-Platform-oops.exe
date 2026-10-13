import type { PayloadRequest, Where } from "payload";
import { type Actor, type RecordData, idOf, isStaff } from "@/lib/domain";
import { summarize } from "./reports";
export async function workspace(
  req: PayloadRequest,
  u: Actor,
  sessionID?: string,
) {
  const all = async (collection: string, where?: Where) =>
    (
      await req.payload.find({
        collection,
        where,
        pagination: false,
        depth: 0,
        sort: "-createdAt",
        overrideAccess: false,
        req,
      })
    ).docs as RecordData[];
  const sessions = await all("placement-sessions");
  const selected = sessions.find((s) => s.id === sessionID) || sessions[0];
  const sessionWhere: Where = selected
    ? { session: { equals: selected.id } }
    : { id: { exists: false } };
  const companies = await all("companies"),
    drives = await all("drives", sessionWhere);
  const applications = await all("applications", sessionWhere);
  const students = u.role === "recruiter" ? [] : await all("students");
  const registrations =
    u.role === "recruiter" ? [] : await all("registrations", sessionWhere);
  const offers =
    u.role === "recruiter" ? [] : await all("offers", sessionWhere);
  const reviews = await all("review-cases", sessionWhere);
  const policies = await all("policy-versions");
  const activities = isStaff(u)
    ? await all("activities", { drive: { in: drives.map((d) => d.id) } })
    : [];
  const attendance =
    u.role === "recruiter"
      ? []
      : await all("attendance", {
          activity: { in: activities.map((a) => a.id) },
        });
  const audits =
    u.role === "admin"
      ? (
          await req.payload.find({
            collection: "audit-events",
            limit: 100,
            depth: 0,
            sort: "-at",
            overrideAccess: false,
            req,
          })
        ).docs
      : [];
  const report = summarize(students, registrations, offers, u);
  const policy = policies.find((p) => p.id === idOf(selected?.policy));
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      student: idOf(u.student),
      canViewSalary: !!u.canViewSalary,
      canViewContacts: !!u.canViewContacts,
    },
    sessions,
    selectedSession: selected?.id || "",
    policy,
    companies,
    drives,
    applications,
    students,
    registrations,
    offers,
    reviews,
    policies,
    activities,
    attendance,
    audits,
    report,
  };
}
export type WorkspaceData = Awaited<ReturnType<typeof workspace>>;
