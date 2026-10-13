// Setup for the jsdom unit projects (ui, app).
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are off, so Testing Library cannot register its own auto-cleanup.
afterEach(() => {
  cleanup();
});
