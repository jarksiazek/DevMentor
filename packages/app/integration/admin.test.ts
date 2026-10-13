import assert from "node:assert/strict";

import { afterAll, beforeAll, describe, inject, it } from "vitest";

import { openBrowser, type Browser } from "./browser.ts";

describe("admin panel", () => {
  const baseUrl = inject("baseUrl");
  let browser: Browser;

  beforeAll(async () => {
    browser = openBrowser(baseUrl, "admin");
    await browser.open("/backend");
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("renders the dashboard shell", async () => {
    assert.equal(await browser.title(), "Dashboard · DevMentor backend");
    assert.equal(await browser.text("h1"), "Dashboard");
    await browser.waitForText("System status and users.");
  });

  it("reports the database as connected", async () => {
    // The status card calls /api/health, which round-trips to the test database.
    await browser.waitForText("Connected");
  });

  // `next start` runs in production, where requireSession fails closed until
  // the auth concept exists. Replace with a CRUD flow once sign-in lands.
  it("does not expose users without a session", async () => {
    await browser.waitForText("Authentication required");
    const response = await fetch(`${baseUrl}/api/users`);
    assert.equal(response.status, 401);
  });

  it("links back to the public site", async () => {
    await browser.clickLink("View site");
    await browser.waitForUrl(`${baseUrl}/`);
    assert.equal(await browser.title(), "DevMentor");
  });
});
