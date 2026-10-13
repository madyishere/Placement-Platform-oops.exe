import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env.local"))
  console.log(".env.local already exists; no settings were changed.");
else {
  writeFileSync(
    ".env.local",
    [
      "# Add your MongoDB Atlas URI here. Do not commit this file.",
      "DATABASE_URI=",
      "PAYLOAD_SECRET=" + randomBytes(48).toString("hex"),
      "AUDIT_SECRET=" + randomBytes(48).toString("hex"),
      "NEXT_PUBLIC_SERVER_URL=http://localhost:3000",
      "ADMIN_EMAIL=",
      "# Set a password with at least 14 characters for the bootstrap command, then remove it.",
      "ADMIN_PASSWORD=",
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created ignored .env.local with independent random secrets. Add DATABASE_URI and bootstrap administrator credentials.",
  );
}
