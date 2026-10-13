import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { collections } from "./collections/index";

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export default buildConfig({
  admin: {
    user: "users",
    importMap: { baseDir },
    meta: { titleSuffix: " · Placement Office" },
    components: { afterNavLinks: ["/components/AdminLinks#default"] },
  },
  collections,
  secret:
    process.env.PAYLOAD_SECRET ||
    "build-only-not-a-runtime-secret-000000000000",
  serverURL: url,
  cors: [url],
  csrf: [url],
  graphQL: { disable: true },
  db: mongooseAdapter({
    url:
      process.env.DATABASE_URI ||
      "mongodb://127.0.0.1:27017/placement?replicaSet=rs0",
    connectOptions: { serverSelectionTimeoutMS: 5000 },
    transactionOptions: {},
  }),
  typescript: {
    autoGenerate: false,
    declare: false,
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
  onInit: async (payload) => {
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32)
      throw new Error(
        "Set a strong PAYLOAD_SECRET before starting the application.",
      );
    if (!process.env.AUDIT_SECRET || process.env.AUDIT_SECRET.length < 32)
      throw new Error(
        "Set a separate AUDIT_SECRET before starting the application.",
      );
    if (process.env.AUDIT_SECRET === process.env.PAYLOAD_SECRET)
      throw new Error("Application and audit secrets must be different.");
    const transaction = await payload.db.beginTransaction();
    if (!transaction)
      throw new Error(
        "MongoDB transactions are required; use Atlas or a replica set.",
      );
    await payload.db.rollbackTransaction(transaction);
  },
});
