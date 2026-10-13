import path from "path";
import dotenv from "dotenv";

// Tests run against a separate database, named after the dev one with a
// "_test" suffix (seize_the_day -> seize_the_day_test), since they truncate
// every table. TEST_DATABASE_URL overrides the derived URL.
export function testDatabaseUrl(): string {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  const explicit = process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!explicit && !base) throw new Error("Set DATABASE_URL or TEST_DATABASE_URL for tests");

  const url = new URL(explicit ?? base!);
  if (!explicit) url.pathname = `${url.pathname}_test`;

  // Hard stop against ever pointing the suite at real data.
  if (!url.pathname.endsWith("_test")) {
    throw new Error(`Refusing to run tests against non-test database "${url.pathname.slice(1)}"`);
  }
  return url.toString();
}
