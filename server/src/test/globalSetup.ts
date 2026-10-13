import { execSync } from "child_process";
import path from "path";
import { testDatabaseUrl } from "./testDatabase";

// Brings the test database's schema up to date once per run.
export default function globalSetup() {
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: "pipe",
  });
}
