import { z } from "zod";
import { courses } from "@/lib/domain";
const id = z.string().regex(/^[a-f0-9]{24}$/i, "Choose a valid record.");
const notes = z.string().trim().min(3).max(3000);
const optionalNotes = z.string().trim().max(3000).optional();
const amount = z.number().int().min(0).max(100000000).nullable().optional();
export const studentInput = z
  .object({
    placementID: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9/-]{3,40}$/),
    name: z.string().trim().min(2).max(120),
    email: z.email().max(240),
    mobile: z
      .string()
      .regex(/^\+?[0-9 ()-]{7,20}$/)
      .or(z.literal(""))
      .optional(),
    course: z.enum(courses),
    batch: z.string().trim().min(4).max(30),
  })
  .strict();
export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create-student"), ...studentInput.shape })
    .strict(),
  z
    .object({
      action: z.literal("edit-student"),
      student: id,
      ...studentInput.shape,
      reason: notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("archive-student"),
      student: id,
      archived: z.boolean(),
      reason: notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("register"),
      student: id,
      session: id,
      status: z.enum(["registered", "deregistered", "not-registered"]),
      eligibility: z.enum(["pending", "eligible", "ineligible"]),
      cgpa: z.number().min(0).max(10).nullable().optional(),
      backlogs: z.number().int().min(0).max(100).nullable().optional(),
      notes,
    })
    .strict(),
  z
    .object({ action: z.literal("apply"), student: id.optional(), drive: id })
    .strict(),
  z
    .object({
      action: z.literal("application-status"),
      application: id,
      status: z.enum(["shortlisted", "selected", "rejected", "withdrawn"]),
      notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("issue-offer"),
      student: id,
      session: id,
      company: id,
      drive: id.optional(),
      source: z.enum(["campus", "off-campus"]),
      type: z.enum(["I", "F", "IF"]),
      combinedOutcome: z.enum(["ppo", "fte"]).default("ppo"),
      ctc: amount,
      stipend: amount,
      stipendPeriod: z.enum(["monthly", "weekly", "total"]),
      issuedAt: z.iso.datetime(),
      companyDeadline: z.iso.datetime().optional(),
      notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("offer-action"),
      offer: id,
      revision: z.number().int().min(0),
      transition: z.enum([
        "accept",
        "decline",
        "expire",
        "revoke",
        "join",
        "not-joined",
        "ppo-offered",
        "ppo-accepted",
        "ppo-declined",
        "noc-approved",
        "noc-rejected",
        "noc-request",
        "correct",
      ]),
      ctc: amount,
      stipend: amount,
      notes: optionalNotes,
    })
    .strict(),
  z
    .object({
      action: z.literal("attendance"),
      student: id,
      activity: id,
      status: z.enum(["present", "absent", "excused"]),
      notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("request-review"),
      student: id.optional(),
      session: id,
      drive: id.optional(),
      kind: z.enum([
        "exception",
        "policy-conflict",
        "offer-proposal",
        "contact-correction",
      ]),
      notes,
    })
    .strict(),
  z
    .object({
      action: z.literal("resolve-review"),
      review: id,
      status: z.enum(["approved", "rejected"]),
      ruleCodes: z.array(z.string().regex(/^[A-Z_]+$/)).max(15),
      excludedDrives: z.array(id).max(3),
      expiresAt: z.iso.datetime().optional(),
      notes,
    })
    .strict(),
]);
export type Command = z.infer<typeof commandSchema>;
