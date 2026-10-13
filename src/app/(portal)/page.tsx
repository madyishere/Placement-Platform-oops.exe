import { redirect } from "next/navigation";
import { context, configured } from "@/services/context";
import { workspace, type WorkspaceData } from "@/services/workspace";
import { AppError } from "@/lib/domain";
import Workspace from "@/components/Workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured())
    return (
      <Workspace
        initial={null}
        setup="Add your MongoDB Atlas connection and application secrets to .env.local to open your workspace."
      />
    );
  let data: WorkspaceData | null = null;
  try {
    const { req, user } = await context();
    data = await workspace(req, user);
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/login");
  }
  return data ? (
    <Workspace initial={data} />
  ) : (
    <Workspace
      initial={null}
      setup="The database could not be reached. Check your Atlas connection, network access and application configuration."
    />
  );
}
