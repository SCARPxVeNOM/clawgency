import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL ?? "http://localhost:3000";
const webPort = process.env.PW_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  workers: Number(process.env.PW_WORKERS ?? "1"),
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: webPort
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
