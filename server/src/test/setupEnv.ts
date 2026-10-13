import { testDatabaseUrl } from "./testDatabase";

// Runs before each test file's modules load, so the shared PrismaClient
// (src/lib/prisma.ts) connects to the test database, never the dev one.
process.env.DATABASE_URL = testDatabaseUrl();
