import { parse } from "csv-parse/sync";
import { studentInput } from "@/validation/commands";
import { context, checkOrigin, transaction } from "@/services/context";
import { execute } from "@/services/placement";
import { AppError, isStaff } from "@/lib/domain";
import { errorResponse } from "@/lib/http";
import { z } from "zod";
import { readJSON } from "@/lib/body";
const schema = z
  .object({ csv: z.string().max(2000000), commit: z.boolean() })
  .strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = schema.parse(await readJSON(request, 2100000));
    const { req, user } = await context(request);
    if (!isStaff(user))
      throw new AppError(403, "Staff access is required for import.");
    let rows: Record<string, string>[];
    try {
      rows = parse(input.csv, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 10000,
      });
    } catch {
      throw new AppError(
        422,
        "The CSV is malformed. Use the provided column template.",
      );
    }
    if (!rows.length || rows.length > 1000)
      throw new AppError(422, "Import between 1 and 1,000 students at a time.");
    const seen = new Set<string>();
    const results = rows.map((row, i) => {
      const parsed = studentInput.safeParse(row);
      let error = parsed.success
        ? ""
        : parsed.error.issues.map((x) => x.message).join("; ");
      if (parsed.success) {
        if (seen.has(parsed.data.placementID))
          error = "Duplicate Placement ID in this file.";
        seen.add(parsed.data.placementID);
        if (
          user.role === "coordinator" &&
          (!user.courses?.includes(parsed.data.course) ||
            (user.batches?.length && !user.batches.includes(parsed.data.batch)))
        )
          error = "Outside your course/batch scope.";
      }
      return {
        row: i + 2,
        placementID: row.placementID,
        error,
        data: parsed.success ? parsed.data : null,
      };
    });
    if (results.some((r) => r.error) || !input.commit)
      return Response.json({
        committed: false,
        rows: results.map(({ data: _data, ...r }) => {
          void _data;
          return r;
        }),
        valid: results.filter((r) => !r.error).length,
      });
    const output = [];
    for (const row of results) {
      try {
        await transaction(req, () =>
          execute(req, user, { action: "create-student", ...row.data! }),
        );
        output.push({
          row: row.row,
          placementID: row.placementID,
          status: "created",
        });
      } catch {
        output.push({
          row: row.row,
          placementID: row.placementID,
          status: "not-created",
          error:
            "Duplicate, permission or database validation failure. No changes were committed for this row.",
        });
      }
    }
    return Response.json(
      {
        committed: true,
        rows: output,
        created: output.filter((r) => r.status === "created").length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
