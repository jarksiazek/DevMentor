import { describe, expect, it } from "vitest";

import { cn } from "./utils.ts";

describe("cn", () => {
  it("joins conditional classes and lets later Tailwind classes win", () => {
    expect(cn("px-2 py-1", false && "hidden", undefined, ["text-sm"], "px-4")).toBe("py-1 text-sm px-4");
  });
});
