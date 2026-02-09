import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL ?? "http://localhost:3000";
const webPort = process.env.PW_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
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
