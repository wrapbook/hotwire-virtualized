import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "src/tests/functional",
  browserStartTimeout: 60000,
  retries: 2,
  testMatch: /(functional|integration)\/.*\.spec\.js/,
  webServer: {
    command: "yarn build && yarn test:server",
    url: "http://localhost:9000/",
  },
  use: {
    baseURL: "http://localhost:9000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
