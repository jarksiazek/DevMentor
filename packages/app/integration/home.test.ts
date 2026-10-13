import assert from "node:assert/strict";

import { afterAll, beforeAll, describe, inject, it } from "vitest";

import { openBrowser, type Browser } from "./browser.ts";

describe("home page", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = openBrowser(inject("baseUrl"), "home");
    await browser.open("/");
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("renders the hero and the feature cards", async () => {
    assert.equal(await browser.title(), "DevMentor");
    assert.equal(await browser.text("h1"), "Grow as a developer with mentors who have shipped it before.");
    assert.equal(await browser.count("article"), 3);
    await browser.waitForText("1:1 mentoring");
  });

  it("links to the admin panel", async () => {
    await browser.clickLink("Open the backend");
    await browser.waitForUrl("**/backend");
    assert.equal(new URL(await browser.url()).pathname, "/backend");
    assert.equal(await browser.title(), "Dashboard · DevMentor backend");
  });
});
