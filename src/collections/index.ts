import type {
  CollectionConfig,
  Field,
  CollectionBeforeChangeHook,
  TextField,
  SelectField,
  RelationshipField,
  NumberField,
  DateField,
} from "payload";
import { APIError } from "payload";
import {
  administrator,
  adminField,
  authenticated,
  commandOnly,
  contactField,
  driveAccess,
  managers,
  salaryField,
  studentAccess,
  studentRelated,
  trusted,
  actor,
} from "@/access";
import { auditChange, auditRead } from "@/lib/audit";
import { courses, roles, idOf, isStaff } from "@/lib/domain";
import { sessionAllowed } from "@/lib/session";

const text = (name: string, required = true): TextField => ({
  name,
  type: "text",
  required,
  maxLength: 240,
});
const select = (
  name: string,
  options: string[],
  defaultValue?: string,
): SelectField => ({
  name,
  type: "select",
  options,
  required: true,
  ...(defaultValue ? { defaultValue } : {}),
});
const relation = (
  name: string,
  relationTo: string,
  required = true,
): RelationshipField => ({
  name,
  type: "relationship",
  relationTo,
  required,
  maxDepth: 0,
  index: true,
});
const num = (name: string, max = 100000000): NumberField => ({
  name,
  type: "number",
  min: 0,
  max,
  validate: (v: unknown) =>
    v == null ||
    (typeof v === "number" && Number.isInteger(v)) ||
    "Enter a non-negative whole number.",
});
const date = (name: string, required = false): DateField => ({
  name,
  type: "date",
  required,
});
const note: Field = { name: "notes", type: "textarea", maxLength: 3000 };
const workflow: CollectionBeforeChangeHook = ({ req, data }) => {
  if (!trusted(req))
    throw new APIError("Use the authorized placement workflow.", 403);
  return data;
};
const guardPolicy: CollectionBeforeChangeHook = ({ originalDoc, data }) => {
  if (originalDoc?.approved)
    throw new APIError(
      "Approved policies are immutable. Create a new version.",
      409,
    );
  const merged = { ...originalDoc, ...data };
  if (!(merged.bMin < merged.aMin && merged.aMin < merged.plusMin))
    throw new APIError("Category thresholds must increase.", 422);
  if (merged.approved && !merged.approvalReference?.trim())
    throw new APIError("An institutional approval reference is required.", 422);
  return data;
};
function collection(
  slug: string,
  fields: Field[],
  protectedWrites = true,
): CollectionConfig {
  return {
    slug,
    admin: {
      group: "Placement operations",
      useAsTitle: "id",
      description: protectedWrites
        ? "Manage transitions from the Placement workspace. These records are read-only here."
        : undefined,
    },
    access: {
      read: studentRelated,
      create: protectedWrites ? commandOnly : managers,
      update: protectedWrites ? commandOnly : managers,
      delete: () => false,
    },
    hooks: {
      beforeChange: protectedWrites ? [workflow] : [],
      afterChange: [auditChange],
    },
    fields,
  };
}

const users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "name", group: "Administration" },
  auth: {
    tokenExpiration: 3600,
    useSessions: true,
    maxLoginAttempts: 5,
    lockTime: 900000,
    cookies: { secure: process.env.NODE_ENV === "production", sameSite: "Lax" },
  },
  access: {
    admin: ({ req }) => isStaff(actor(req)),
    create: administrator,
    read: ({ req }) =>
      actor(req)?.role === "admin"
        ? true
        : req.user && !actor(req)?.disabled
          ? { id: { equals: req.user.id } }
          : false,
    update: administrator,
    delete: () => false,
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.disabled) throw new APIError("Sign in is unavailable.", 403);
        return user;
      },
    ],
    beforeChange: [
      ({ req, data }) => {
        if (
          actor(req)?.role !== "admin" &&
          !(trusted(req) && req.context.bootstrap === true)
        )
          throw new APIError(
            "Only an administrator can provision accounts. Use the bootstrap command for initial setup.",
            403,
          );
        return data;
      },
    ],
    afterChange: [auditChange],
  },
  fields: [
    text("name"),
    {
      ...select("role", [...roles], "student"),
      access: { create: adminField, update: adminField },
    },
    {
      name: "courses",
      type: "select",
      hasMany: true,
      options: [...courses],
      access: { create: adminField, update: adminField },
    },
    {
      name: "batches",
      type: "text",
      hasMany: true,
      maxLength: 30,
      access: { create: adminField, update: adminField },
    },
    relation("student", "students", false),
    relation("company", "companies", false),
    { name: "canViewContacts", type: "checkbox", defaultValue: false },
    { name: "canViewSalary", type: "checkbox", defaultValue: false },
    { name: "disabled", type: "checkbox", defaultValue: false },
  ],
};
const students = collection("students", [
  text("placementID"),
  text("name"),
  {
    name: "email",
    type: "email",
    required: true,
    access: { read: contactField },
  },
  { ...text("mobile", false), access: { read: contactField } },
  select("course", [...courses]),
  text("batch"),
  { name: "archived", type: "checkbox", defaultValue: false },
]);
students.admin = {
  ...students.admin,
  useAsTitle: "name",
  defaultColumns: ["placementID", "name", "course", "batch", "archived"],
};
students.access!.read = studentAccess;
students.fields[0] = {
  name: "placementID",
  type: "text",
  unique: true,
  index: true,
  required: true,
  maxLength: 40,
};
students.hooks!.afterRead = [auditRead];
users.hooks!.beforeOperation = [
  ({ operation, req }) => {
    if (operation === "refresh" && !sessionAllowed(req))
      throw new APIError("Your session has ended. Sign in again.", 401);
  },
];
users.hooks!.beforeChange!.push(({ data }) => {
  if (
    data.password &&
    (typeof data.password !== "string" || data.password.length < 14)
  )
    throw new APIError("Use a password with at least 14 characters.", 422);
  return data;
});
const sessions = collection(
  "placement-sessions",
  [
    text("name"),
    date("startsAt", true),
    date("endsAt", true),
    relation("policy", "policy-versions", false),
  ],
  false,
);
sessions.access = {
  read: authenticated,
  create: administrator,
  update: administrator,
  delete: () => false,
};
sessions.admin = {
  ...sessions.admin,
  useAsTitle: "name",
  group: "Administration",
};
const companies = collection(
  "companies",
  [text("name"), text("industry", false), text("website", false)],
  false,
);
companies.admin = { ...companies.admin, useAsTitle: "name" };
companies.access!.read = authenticated;
const drives = collection(
  "drives",
  [
    text("title"),
    relation("company", "companies"),
    relation("session", "placement-sessions"),
    select("type", ["I", "F", "IF"]),
    select("status", ["draft", "open", "closed"], "draft"),
    num("ctc"),
    num("stipend"),
    select("stipendPeriod", ["monthly", "weekly", "total"], "monthly"),
    {
      name: "courses",
      type: "select",
      hasMany: true,
      options: [...courses],
      required: true,
    },
    { name: "minCGPA", type: "number", min: 0, max: 10 },
    num("maxBacklogs", 100),
    date("deadline", true),
    note,
  ],
  false,
);
drives.admin = { ...drives.admin, useAsTitle: "title" };
drives.access!.read = driveAccess;
const registrations = collection("registrations", [
  relation("student", "students"),
  relation("session", "placement-sessions"),
  { ...text("key"), unique: true },
  select(
    "status",
    ["registered", "deregistered", "not-registered"],
    "not-registered",
  ),
  select("eligibility", ["pending", "eligible", "ineligible"], "pending"),
  { name: "cgpa", type: "number", min: 0, max: 10 },
  num("backlogs", 100),
  num("revision"),
  note,
]);
const applications = collection("applications", [
  relation("student", "students"),
  relation("drive", "drives"),
  relation("company", "companies"),
  relation("session", "placement-sessions"),
  { ...text("key"), unique: true },
  select(
    "status",
    ["submitted", "review", "shortlisted", "selected", "rejected", "withdrawn"],
    "submitted",
  ),
  { name: "decision", type: "json", required: true },
  relation("policy", "policy-versions", false),
  { name: "candidateName", type: "text" },
  { name: "candidateCourse", type: "text" },
]);
applications.access!.read = ({ req, ...rest }) =>
  actor(req)?.role === "recruiter" && !actor(req)?.disabled
    ? {
        company: {
          equals: idOf(actor(req)?.company) || "000000000000000000000000",
        },
      }
    : studentRelated({ req, ...rest });
const offers = collection("offers", [
  relation("student", "students"),
  relation("session", "placement-sessions"),
  relation("company", "companies"),
  relation("drive", "drives", false),
  select("source", ["campus", "off-campus"]),
  select("type", ["I", "F", "IF"]),
  { ...num("ctc"), access: { read: salaryField } },
  { ...num("stipend"), access: { read: salaryField } },
  select("stipendPeriod", ["monthly", "weekly", "total"], "monthly"),
  date("issuedAt", true),
  date("deadline", true),
  select(
    "acceptance",
    ["pending", "accepted", "declined", "expired"],
    "pending",
  ),
  select(
    "ppo",
    ["not-applicable", "pending", "offered", "accepted", "declined"],
    "not-applicable",
  ),
  select("joining", ["pending", "joined", "not-joined"], "pending"),
  select(
    "noc",
    ["not-applicable", "pending", "approved", "rejected"],
    "not-applicable",
  ),
  { name: "revoked", type: "checkbox", defaultValue: false },
  num("revision"),
  { name: "decision", type: "json" },
  note,
]);
offers.hooks!.afterRead = [auditRead];
offers.fields.push(select("combinedOutcome", ["ppo", "fte"], "ppo"));
offers.fields.push({
  name: "campusKey",
  type: "text",
  unique: true,
  index: true,
  admin: { hidden: true },
});
const activities = collection(
  "activities",
  [
    text("title"),
    relation("drive", "drives"),
    date("startsAt", true),
    select("type", ["talk", "test", "interview", "presentation", "other"]),
  ],
  false,
);
activities.access!.read = ({ req }) => isStaff(actor(req));
activities.admin = { ...activities.admin, useAsTitle: "title" };
const attendance = collection("attendance", [
  relation("student", "students"),
  relation("activity", "activities"),
  { ...text("key"), unique: true },
  select("status", ["present", "absent", "excused"]),
  note,
]);
const reviews = collection("review-cases", [
  relation("student", "students"),
  relation("session", "placement-sessions"),
  relation("drive", "drives", false),
  select("kind", [
    "absence",
    "exception",
    "policy-conflict",
    "offer-proposal",
    "contact-correction",
  ]),
  select("status", ["pending", "approved", "rejected"], "pending"),
  note,
  { name: "ruleCodes", type: "text", hasMany: true },
  {
    name: "excludedDrives",
    type: "relationship",
    relationTo: "drives",
    hasMany: true,
    maxDepth: 0,
  },
  date("expiresAt"),
  text("decidedBy", false),
  date("decidedAt"),
]);
const policies = collection(
  "policy-versions",
  [
    text("name"),
    { name: "approved", type: "checkbox", defaultValue: false },
    text("approvalReference", false),
    { ...num("bMin"), defaultValue: 600000, required: true },
    { ...num("aMin"), defaultValue: 1000000, required: true },
    { ...num("plusMin"), defaultValue: 1600000, required: true },
    select("selectionBasis", ["issued", "accepted", "review"], "review"),
    select("fSwitch", ["blocked", "category", "review"], "review"),
    select("offCampus", ["include", "exclude", "review"], "review"),
    select("cSwitch", ["higher", "review"], "review"),
    select("sameCompany", ["allow", "block", "review"], "review"),
    note,
  ],
  false,
);
policies.admin = {
  ...policies.admin,
  useAsTitle: "name",
  group: "Administration",
};
policies.access = {
  read: authenticated,
  create: administrator,
  update: administrator,
  delete: () => false,
};
policies.hooks!.beforeChange = [guardPolicy];
reviews.fields.push(relation("company", "companies", false));
reviews.access!.read = ({ req, ...rest }) =>
  actor(req)?.role === "recruiter"
    ? {
        company: {
          equals: idOf(actor(req)?.company) || "000000000000000000000000",
        },
      }
    : studentRelated({ req, ...rest });
users.access!.read = ({ req }) =>
  actor(req)?.role === "admin"
    ? true
    : actor(req)
      ? { id: { equals: req.user!.id } }
      : false;
const audits: CollectionConfig = {
  slug: "audit-events",
  admin: {
    group: "Administration",
    defaultColumns: ["at", "actor", "action", "target"],
  },
  access: {
    read: administrator,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    text("actor"),
    text("action"),
    text("target"),
    date("at", true),
    text("requestID"),
    { name: "details", type: "json" },
    text("signature"),
    { name: "commandID", type: "text", unique: true, index: true },
  ],
};
export const collections: CollectionConfig[] = [
  users,
  students,
  sessions,
  companies,
  drives,
  registrations,
  applications,
  offers,
  activities,
  attendance,
  reviews,
  policies,
  audits,
];
