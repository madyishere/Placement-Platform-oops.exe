import { AppError } from "./domain";
import { ZodError } from "zod";
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 422 },
    );
  const value = error as { status?: number; code?: number; name?: string };
  if (value.code === 11000)
    return Response.json(
      { error: "This record already exists. Refresh before retrying." },
      { status: 409 },
    );
  if (value.code === 112 || value.name === "MongoServerError")
    return Response.json(
      {
        error:
          "The record changed concurrently or the database rejected the operation. Refresh and retry.",
      },
      { status: 409 },
    );
  if ([401, 403, 404, 409, 422].includes(value.status || 0))
    return Response.json(
      {
        error:
          value.status === 404
            ? "Record unavailable."
            : value.status === 403
              ? "You do not have permission to perform this action."
              : "The operation could not be completed. Check the record and try again.",
      },
      { status: value.status },
    );
  console.error("Placement request failed:", value.name || "Error");
  return Response.json(
    {
      error:
        "The service is unavailable. Check your database configuration or contact the administrator.",
    },
    { status: 503 },
  );
}
