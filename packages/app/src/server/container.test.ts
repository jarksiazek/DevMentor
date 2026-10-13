import { describe, expect, it } from "vitest";

import { withRequestScope as coreWithRequestScope } from "@devmentor/core";

import { withRequestScope } from "./container.ts";

describe("server/container", () => {
  it("re-exports withRequestScope from @devmentor/core", () => {
    expect(withRequestScope).toBe(coreWithRequestScope);
  });
});
