import { context } from "@/services/context";
import { workspace } from "@/services/workspace";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { req, user } = await context(request);
    return Response.json(
      await workspace(
        req,
        user,
        new URL(request.url).searchParams.get("session") || undefined,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
