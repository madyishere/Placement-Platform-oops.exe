import { context } from "@/services/context";
import { workspace } from "@/services/workspace";
import { audit } from "@/lib/audit";
import { AppError, isStaff, idOf, salaryAllowed } from "@/lib/domain";
import { errorResponse } from "@/lib/http";
function cell(v: unknown) {
  const text = String(v ?? "");
  const safe =
    /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export async function GET(request: Request) {
  try {
    const { req, user } = await context(request);
    if (!isStaff(user))
      throw new AppError(403, "Staff export permission is required.");
    const params = new URL(request.url).searchParams,
      purpose = params.get("purpose")?.trim();
    if (!purpose || purpose.length < 5 || purpose.length > 300)
      throw new AppError(422, "Provide a short export purpose.");
    const data = await workspace(req, user, params.get("session") || undefined);
    const kind = params.get("kind") === "offers" ? "offers" : "students";
    if (kind === "offers" && !salaryAllowed(user))
      throw new AppError(403, "Compensation export permission is required.");
    const rows: unknown[][] = [
      [
        "Placement ID",
        "Name",
        "Course",
        "Batch",
        "Registration",
        "Eligibility",
        "Session",
      ],
    ];
    for (const s of data.students) {
      const r = data.registrations.find((r) => idOf(r.student) === s.id);
      rows.push([
        s.placementID,
        s.name,
        s.course,
        s.batch,
        r?.status || "not-registered",
        r?.eligibility || "pending",
        data.sessions.find((x) => x.id === data.selectedSession)?.name,
      ]);
    }
    if (kind === "offers") {
      rows.length = 0;
      rows.push([
        "Placement ID",
        "Company",
        "Offer type",
        "Annual CTC INR",
        "Stipend INR",
        "Stipend period",
        "Acceptance",
        "PPO",
        "Joining",
        "NOC",
        "Issued at UTC",
        "Deadline UTC",
        "Revoked",
        "Session",
      ]);
      for (const offer of data.offers)
        rows.push([
          data.students.find((s) => s.id === idOf(offer.student))?.placementID,
          data.companies.find((c) => c.id === idOf(offer.company))?.name,
          offer.type,
          offer.ctc,
          offer.stipend,
          offer.stipendPeriod,
          offer.acceptance,
          offer.ppo,
          offer.joining,
          offer.noc,
          offer.issuedAt,
          offer.deadline,
          !!offer.revoked,
          data.sessions.find((s) => s.id === data.selectedSession)?.name,
        ]);
    }
    await audit(req, `export.${kind}`, data.selectedSession || "none", {
      purpose,
      count: rows.length - 1,
      columns: rows[0],
    });
    return new Response(
      "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="placement-${kind}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
