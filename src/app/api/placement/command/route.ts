import { context, checkOrigin, transaction } from "@/services/context";
import { commandSchema } from "@/validation/commands";
import { execute } from "@/services/placement";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/domain";
import { errorResponse } from "@/lib/http";
import { readJSON } from "@/lib/body";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const command = commandSchema.parse(await readJSON(request, 16000));
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
      throw new AppError(422, "A valid idempotency key is required.");
    const { req, user } = await context(request);
    const commandID = `${user.id}:${command.action}:${key}`;
    const previous = await req.payload.find({
      collection: "audit-events",
      where: { commandID: { equals: commandID } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    });
    if (previous.docs.length)
      return Response.json({
        ok: true,
        replayed: true,
        message:
          "This action was already completed. Refresh to see the current record.",
      });
    const result = await transaction(req, async () => {
      const result = await execute(req, user, command);
      await audit(
        req,
        "command.complete",
        command.action,
        {
          resultID: "id" in result ? result.id : null,
          outcome: "outcome" in result ? result.outcome : "complete",
        },
        commandID,
      );
      return result;
    });
    return Response.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
