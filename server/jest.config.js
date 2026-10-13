/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/test/setupEnv.ts"],
  globalSetup: "<rootDir>/src/test/globalSetup.ts",
  // Test files share one database, so they run one at a time.
  maxWorkers: 1,
};
