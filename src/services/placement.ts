import type { PayloadRequest, Where } from "payload";
import {
  type Actor,
  type RecordData,
  AppError,
  idOf,
  isManager,
  isStaff,
} from "@/lib/domain";
import {
  evaluate,
  proposedPolicy,
  type OfferFact,
  type Policy,
} from "@/policy/evaluate";
import { audit } from "@/lib/audit";
import type { Command } from "@/validation/commands";

const read = (req: PayloadRequest, collection: string, id: string) =>
  req.payload.findByID({
    collection,
    id,
    depth: 0,
    overrideAccess: false,
    req,
  }) as Promise<RecordData>;
const find = async (req: PayloadRequest, collection: string, where: Where) =>
  (
    await req.payload.find({
      collection,
      where,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      req,
    })
  ).docs as RecordData[];
const create = (
  req: PayloadRequest,
  collection: string,
  data: Record<string, unknown>,
) =>
  req.payload.create({
    collection,
    data,
    depth: 0,
    overrideAccess: false,
    req,
  }) as Promise<RecordData>;
const update = (
  req: PayloadRequest,
  collection: string,
  id: string,
  data: Record<string, unknown>,
) =>
  req.payload.update({
    collection,
    id,
    data,
    depth: 0,
    overrideAccess: false,
    req,
  }) as Promise<RecordData>;
function requireStaff(u: Actor) {
  if (!isStaff(u))
    throw new AppError(403, "Placement staff access is required.");
}
function requireManager(u: Actor) {
  if (!isManager(u))
    throw new AppError(403, "A placement officer must perform this action.");
}
function ownStudent(u: Actor, student: string) {
  if (u.role === "student" && idOf(u.student) !== student)
    throw new AppError(403, "You can access only your own placement record.");
}
async function student(req: PayloadRequest, u: Actor, id: string) {
  ownStudent(u, id);
  return read(req, "students", id);
}
async function registration(
  req: PayloadRequest,
  studentID: string,
  session: string,
  lock = true,
) {
  const [r] = await find(req, "registrations", {
    key: { equals: `${studentID}:${session}` },
  });
  if (!r)
    throw new AppError(422, "Create the student’s session registration first.");
  if (lock)
    return update(req, "registrations", r.id, {
      revision: Number(r.revision || 0) + 1,
    });
  return r;
}
export async function decisionFor(
  req: PayloadRequest,
  u: Actor,
  studentID: string,
  driveID: string,
) {
  const s = await student(req, u, studentID);
  const drive = await read(req, "drives", driveID);
  const session = await read(req, "placement-sessions", idOf(drive.session));
  const r = await registration(req, studentID, session.id);
  const policy = session.policy
    ? await read(req, "policy-versions", idOf(session.policy))
    : null;
  // The officer/student sees the relevant salary fields. Coordinators cannot authorize participation.
  const offers = await find(req, "offers", {
    and: [
      { student: { equals: studentID } },
      { session: { equals: session.id } },
    ],
  });
  const reviews = await find(req, "review-cases", {
    and: [
      { student: { equals: studentID } },
      { session: { equals: session.id } },
      { status: { equals: "approved" } },
    ],
  });
  const active = reviews.filter(
    (x) => !x.expiresAt || Date.parse(String(x.expiresAt)) > Date.now(),
  );
  const exceptions = active
    .filter((x) => x.kind === "exception" && idOf(x.drive) === drive.id)
    .flatMap((x) =>
      Array.isArray(x.ruleCodes) ? (x.ruleCodes as string[]) : [],
    );
  const sanctioned = active.some(
    (x) =>
      Array.isArray(x.excludedDrives) &&
      x.excludedDrives.some((d) => idOf(d) === drive.id),
  );
  let eligible: boolean | null =
    Array.isArray(drive.courses) && drive.courses.includes(s.course);
  if (eligible && drive.minCGPA != null)
    eligible = r.cgpa == null ? null : Number(r.cgpa) >= Number(drive.minCGPA);
  if (eligible !== false && drive.maxBacklogs != null)
    eligible =
      r.backlogs == null
        ? null
        : Number(r.backlogs) <= Number(drive.maxBacklogs) && eligible;
  const result = evaluate({
    registered: r.status === "registered" && !s.archived,
    eligibility: String(r.eligibility),
    companyEligible: eligible,
    driveOpen:
      drive.status === "open" &&
      Date.parse(String(session.startsAt)) <= Date.now() &&
      Date.parse(String(session.endsAt)) > Date.now() &&
      Date.parse(String(drive.deadline)) > Date.now(),
    offers: offers.map((o) => ({
      company: idOf(o.company),
      type: o.type,
      ctc: o.ctc,
      acceptance: o.acceptance,
      source: o.source,
      revoked: o.revoked,
    })) as OfferFact[],
    target: {
      company: idOf(drive.company),
      type: drive.type as OfferFact["type"],
      ctc: drive.ctc as number | null,
    },
    policy: policy
      ? ({ ...proposedPolicy, ...policy } as Policy)
      : proposedPolicy,
    sanctioned,
    exceptions,
  });
  return { result, s, drive, session, r, policy };
}
async function recordConflict(
  req: PayloadRequest,
  studentID: string,
  session: string,
  drive: string | undefined,
  notes: string,
) {
  return create(req, "review-cases", {
    student: studentID,
    session,
    drive,
    kind: "policy-conflict",
    status: "pending",
    notes,
  });
}
export async function execute(
  req: PayloadRequest,
  u: Actor,
  c: Command,
): Promise<RecordData | { outcome: string; reasons: unknown; id?: string }> {
  if (c.action === "create-student" || c.action === "edit-student") {
    requireStaff(u);
    if (
      u.role === "coordinator" &&
      (!u.courses?.includes(c.course) ||
        (u.batches?.length && !u.batches.includes(c.batch)))
    )
      throw new AppError(
        403,
        "The course or batch is outside your assigned scope.",
      );
    const { action, ...rest } = c;
    if (action === "edit-student" && "student" in rest) {
      const { student: target, reason, ...data } = rest;
      await student(req, u, target);
      await audit(req, "student.correction", target, { reason });
      const registrations = await find(req, "registrations", {
        student: { equals: target },
      });
      for (const r of registrations)
        await update(req, "registrations", r.id, {
          revision: Number(r.revision || 0) + 1,
        });
      return update(req, "students", target, data);
    }
    return create(req, "students", rest);
  }
  if (c.action === "archive-student") {
    requireStaff(u);
    await student(req, u, c.student);
    const regs = await find(req, "registrations", {
      student: { equals: c.student },
    });
    for (const r of regs)
      await update(req, "registrations", r.id, {
        revision: Number(r.revision || 0) + 1,
      });
    await audit(req, "student.archive", c.student, { reason: c.reason });
    return update(req, "students", c.student, { archived: c.archived });
  }
  if (c.action === "register") {
    requireStaff(u);
    await student(req, u, c.student);
    await read(req, "placement-sessions", c.session);
    const key = `${c.student}:${c.session}`,
      [r] = await find(req, "registrations", { key: { equals: key } });
    const { action: _action, ...data } = c;
    void _action;
    return r
      ? update(req, "registrations", r.id, {
          ...data,
          revision: Number(r.revision || 0) + 1,
        })
      : create(req, "registrations", { ...data, key, revision: 0 });
  }
  if (c.action === "apply") {
    if (!isManager(u) && u.role !== "student")
      throw new AppError(
        403,
        "Only students or placement officers can submit applications.",
      );
    const studentID = u.role === "student" ? idOf(u.student) : c.student;
    if (!studentID) throw new AppError(422, "Select a student.");
    const { result, s, drive, session, policy } = await decisionFor(
      req,
      u,
      studentID,
      c.drive,
    );
    if (result.outcome === "BLOCK") {
      await audit(req, "application.blocked", studentID, result);
      return result;
    }
    const application = await create(req, "applications", {
      student: studentID,
      drive: drive.id,
      session: session.id,
      company: idOf(drive.company),
      key: `${studentID}:${drive.id}`,
      status: result.outcome === "ALLOW" ? "submitted" : "review",
      decision: {
        ...result,
        evaluatedAt: new Date().toISOString(),
        policy: policy?.id,
      },
      policy: policy?.id,
      candidateName: s.name,
      candidateCourse: s.course,
    });
    if (result.outcome === "MANUAL_REVIEW")
      await recordConflict(
        req,
        studentID,
        session.id,
        drive.id,
        result.reasons.map((r) => r.message).join(" "),
      );
    return { ...result, id: application.id };
  }
  if (c.action === "application-status") {
    const a = await read(req, "applications", c.application);
    if (c.status === "withdrawn" && u.role === "student")
      ownStudent(u, idOf(a.student));
    else requireManager(u);
    if (["rejected", "withdrawn", "selected"].includes(String(a.status)))
      throw new AppError(409, "This application already has a final outcome.");
    if (c.status === "shortlisted" || c.status === "selected") {
      const { result } = await decisionFor(
        req,
        u,
        idOf(a.student),
        idOf(a.drive),
      );
      if (result.outcome !== "ALLOW") {
        await audit(req, "application.transition-denied", a.id, result);
        return result;
      }
    }
    await audit(req, "application.transition", a.id, {
      notes: c.notes,
      status: c.status,
    });
    return update(req, "applications", a.id, { status: c.status });
  }
  if (c.action === "issue-offer") {
    requireManager(u);
    await student(req, u, c.student);
    await read(req, "companies", c.company);
    await read(req, "placement-sessions", c.session);
    let decision: unknown;
    if (c.source === "campus") {
      if (!c.drive)
        throw new AppError(422, "A campus offer must reference a drive.");
      const evaluated = await decisionFor(req, u, c.student, c.drive);
      if (
        idOf(evaluated.drive.company) !== c.company ||
        evaluated.session.id !== c.session ||
        evaluated.drive.type !== c.type
      )
        throw new AppError(
          422,
          "The offer must match its drive, company and session.",
        );
      if (
        evaluated.drive.ctc !== c.ctc &&
        !(evaluated.drive.ctc == null && c.ctc == null)
      )
        throw new AppError(
          422,
          "Confirm the drive’s CTC before issuing an offer with a different package.",
        );
      const [application] = await find(req, "applications", {
        key: { equals: `${c.student}:${c.drive}` },
      });
      if (!application || application.status !== "selected")
        throw new AppError(
          422,
          "An officially selected application is required.",
        );
      if (evaluated.result.outcome !== "ALLOW") {
        await audit(req, "offer.issue-denied", c.student, evaluated.result);
        return evaluated.result;
      }
      decision = evaluated.result;
    } else {
      if (c.drive)
        throw new AppError(
          422,
          "Off-campus offers must not reference a campus drive.",
        );
      await registration(req, c.student, c.session);
      await recordConflict(
        req,
        c.student,
        c.session,
        undefined,
        "Off-campus offer recorded for policy and NOC review. " + c.notes,
      );
    }
    if (c.type === "I" && c.ctc != null)
      throw new AppError(
        422,
        "Internship-only offers must not contain annual FTE CTC.",
      );
    if (Date.parse(c.issuedAt) > Date.now())
      throw new AppError(422, "The issue date cannot be in the future.");
    const deadline = new Date(
      Math.min(
        Date.parse(c.issuedAt) + 86400000,
        c.companyDeadline ? Date.parse(c.companyDeadline) : Infinity,
      ),
    ).toISOString();
    if (Date.parse(deadline) < Date.parse(c.issuedAt))
      throw new AppError(
        422,
        "The company deadline must not precede issuance.",
      );
    const { action: _action, companyDeadline: _deadline, ...data } = c;
    void _action;
    void _deadline;
    return create(req, "offers", {
      ...data,
      ...(c.source === "campus"
        ? { campusKey: `${c.student}:${c.drive}` }
        : {}),
      deadline,
      acceptance: Date.parse(deadline) <= Date.now() ? "expired" : "pending",
      ppo:
        c.type === "IF" && c.combinedOutcome !== "fte"
          ? "pending"
          : "not-applicable",
      joining: "pending",
      noc: c.source === "off-campus" ? "pending" : "not-applicable",
      revision: 0,
      decision,
    });
  }
  if (c.action === "offer-action") {
    const o = await read(req, "offers", c.offer);
    if (
      ["accept", "decline", "noc-request"].includes(c.transition) &&
      u.role === "student"
    )
      ownStudent(u, idOf(o.student));
    else requireManager(u);
    await registration(req, idOf(o.student), idOf(o.session));
    if (Number(o.revision || 0) !== c.revision || o.revoked)
      throw new AppError(
        409,
        "This offer has changed. Refresh before retrying.",
      );
    const data: Record<string, unknown> = { revision: c.revision + 1 };
    if (["accept", "decline"].includes(c.transition)) {
      if (
        o.acceptance !== "pending" ||
        Date.parse(String(o.deadline)) <= Date.now()
      )
        throw new AppError(409, "The offer is no longer open for a response.");
      data.acceptance = c.transition === "accept" ? "accepted" : "declined";
    } else if (c.transition === "expire") {
      if (
        o.acceptance !== "pending" ||
        Date.parse(String(o.deadline)) > Date.now()
      )
        throw new AppError(
          409,
          "Only a pending offer past its deadline can expire.",
        );
      data.acceptance = "expired";
    } else if (c.transition === "revoke") {
      if (!c.notes) throw new AppError(422, "A revocation reason is required.");
      data.revoked = true;
    } else if (c.transition === "correct") {
      if (!c.notes) throw new AppError(422, "A correction reason is required.");
      if (o.type === "I" && c.ctc != null)
        throw new AppError(422, "Internship-only offers cannot have FTE CTC.");
      if (c.ctc !== undefined) data.ctc = c.ctc;
      if (c.stipend !== undefined) data.stipend = c.stipend;
    } else if (c.transition === "join" || c.transition === "not-joined") {
      if (o.acceptance !== "accepted")
        throw new AppError(409, "Only accepted offers can update joining.");
      data.joining = c.transition === "join" ? "joined" : "not-joined";
    } else if (c.transition.startsWith("ppo-")) {
      if (
        o.type !== "IF" ||
        o.combinedOutcome === "fte" ||
        o.acceptance !== "accepted"
      )
        throw new AppError(
          422,
          "PPO updates require an accepted combined offer.",
        );
      const next = c.transition.slice(4);
      if (
        (next === "offered" && o.ppo !== "pending") ||
        (next !== "offered" && o.ppo !== "offered")
      )
        throw new AppError(409, "Invalid PPO transition.");
      if (next === "accepted" && !(Number(o.ctc) > 0))
        throw new AppError(
          422,
          "Record confirmed annual CTC before accepting a PPO.",
        );
      data.ppo = next;
    } else {
      if (c.transition === "noc-request") {
        if (!["not-applicable", "rejected"].includes(String(o.noc)))
          throw new AppError(409, "NOC already requested.");
        data.noc = "pending";
      } else {
        if (o.noc !== "pending")
          throw new AppError(409, "A pending NOC request is required.");
        data.noc = c.transition === "noc-approved" ? "approved" : "rejected";
      }
    }
    await audit(req, "offer.transition", o.id, {
      transition: c.transition,
      notes: c.notes || "",
    });
    return update(req, "offers", o.id, data);
  }
  if (c.action === "attendance") {
    requireStaff(u);
    await student(req, u, c.student);
    const a = await read(req, "activities", c.activity),
      d = await read(req, "drives", idOf(a.drive));
    await registration(req, c.student, idOf(d.session));
    const [application] = await find(req, "applications", {
      key: { equals: `${c.student}:${d.id}` },
    });
    if (
      !application ||
      ["review", "rejected", "withdrawn"].includes(String(application.status))
    )
      throw new AppError(
        422,
        "The student is not an approved participant in this drive.",
      );
    const key = `${c.student}:${c.activity}`,
      [previous] = await find(req, "attendance", { key: { equals: key } });
    if (c.status === "absent" && previous?.status !== "absent")
      await create(req, "review-cases", {
        student: c.student,
        session: idOf(d.session),
        drive: d.id,
        kind: "absence",
        status: "pending",
        notes: c.notes,
      });
    const data = {
      student: c.student,
      activity: c.activity,
      status: c.status,
      key,
      notes: c.notes,
    };
    return previous
      ? update(req, "attendance", previous.id, data)
      : create(req, "attendance", data);
  }
  if (c.action === "request-review") {
    const studentID = u.role === "student" ? idOf(u.student) : c.student;
    if (!studentID) throw new AppError(422, "Select a student.");
    if (u.role === "recruiter") {
      if (c.kind !== "offer-proposal" || !c.drive)
        throw new AppError(
          403,
          "Recruiters can submit offer proposals for their own drives.",
        );
      const d = await read(req, "drives", c.drive);
      if (idOf(d.session) !== c.session)
        throw new AppError(422, "Session must match the drive.");
      const [a] = await find(req, "applications", {
        and: [
          { student: { equals: studentID } },
          { drive: { equals: c.drive } },
        ],
      });
      if (!a)
        throw new AppError(
          403,
          "The candidate is not shared with your company.",
        );
    } else {
      await student(req, u, studentID);
      await registration(req, studentID, c.session);
      if (c.drive) {
        const d = await read(req, "drives", c.drive);
        if (idOf(d.session) !== c.session)
          throw new AppError(
            422,
            "The review drive must belong to the selected session.",
          );
      }
    }
    return create(req, "review-cases", {
      student: studentID,
      session: c.session,
      drive: c.drive,
      kind: c.kind,
      notes: c.notes,
      status: "pending",
      ...(u.role === "recruiter" ? { company: idOf(u.company) } : {}),
    });
  }
  if (c.action === "resolve-review") {
    if (u.role !== "admin")
      throw new AppError(
        403,
        "Only the placement administrator can approve exceptions or sanctions.",
      );
    const review = await read(req, "review-cases", c.review);
    if (review.status !== "pending")
      throw new AppError(409, "This review is already resolved.");
    await registration(req, idOf(review.student), idOf(review.session));
    if (
      c.status === "approved" &&
      review.kind === "exception" &&
      (!review.drive ||
        !c.expiresAt ||
        Date.parse(c.expiresAt) <= Date.now() ||
        !c.ruleCodes.length)
    )
      throw new AppError(
        422,
        "Exceptions need a specific drive, future expiry and named rules.",
      );
    if (review.kind !== "absence" && c.excludedDrives.length)
      throw new AppError(
        422,
        "Drive exclusion applies only to absence reviews.",
      );
    if (review.kind !== "exception" && c.ruleCodes.length)
      throw new AppError(
        422,
        "Rule overrides apply only to exception reviews.",
      );
    for (const target of c.excludedDrives) {
      const d = await read(req, "drives", target);
      if (idOf(d.session) !== idOf(review.session))
        throw new AppError(
          422,
          "Excluded drives must belong to this placement session.",
        );
    }
    return update(req, "review-cases", review.id, {
      status: c.status,
      ruleCodes: c.ruleCodes,
      excludedDrives: c.excludedDrives,
      expiresAt: c.expiresAt,
      decidedBy: u.id,
      decidedAt: new Date().toISOString(),
      notes: String(review.notes || "") + "\nDecision: " + c.notes,
    });
  }
  throw new AppError(422, "Unknown placement action.");
}
