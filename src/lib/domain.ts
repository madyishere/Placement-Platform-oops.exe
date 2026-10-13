export const courses = [
  "M.Tech. CS",
  "M.Tech. AI & DS",
  "B.Tech.–M.Tech. CSE",
  "M.Sc. CS",
  "M.Sc. DFIS",
] as const;
export const roles = [
  "admin",
  "officer",
  "coordinator",
  "recruiter",
  "student",
] as const;
export type Role = (typeof roles)[number];
export type Actor = {
  id: string;
  role: Role;
  email?: string;
  name?: string;
  courses?: string[] | null;
  batches?: string[] | null;
  company?: unknown;
  student?: unknown;
  disabled?: boolean | null;
  canViewContacts?: boolean | null;
  canViewSalary?: boolean | null;
};
export type RecordData = { id: string; [key: string]: unknown };
export const idOf = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
      ? String(value.id)
      : "";
export const isStaff = (u: Actor | null | undefined) =>
  !!u && !u.disabled && ["admin", "officer", "coordinator"].includes(u.role);
export const isManager = (u: Actor | null | undefined) =>
  !!u && !u.disabled && ["admin", "officer"].includes(u.role);
export const salaryAllowed = (u: Actor) =>
  isManager(u) || !!u.canViewSalary || u.role === "student";
export const contactAllowed = (u: Actor) =>
  isManager(u) || !!u.canViewContacts || u.role === "student";
export const money = (value: unknown) =>
  typeof value === "number"
    ? `₹${(value / 100000).toFixed(2)} LPA`
    : "Not disclosed";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
