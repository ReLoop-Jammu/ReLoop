import { defineConfig, devices } from "@playwright/test";

/**
 * Journey tests against the SIMULATION site (never production): the demo
 * deployment by default, or SIM_BASE_URL. Run with: npm run test:sim -w frontend
 */
export default defineConfig({
  testDir: "./tests/sim",
  fullyParallel: false,
  retries: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.SIM_BASE_URL ?? "https://re-loop-demo-beige.vercel.app",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
