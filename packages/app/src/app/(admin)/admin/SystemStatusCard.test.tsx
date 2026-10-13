import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ApiResult } from "@devmentor/ui/backend/api";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@devmentor/ui/backend/api", () => ({ apiCall }));

const { SystemStatusCard } = await import("./SystemStatusCard.tsx");

function deferred() {
  let resolve!: (value: ApiResult<unknown>) => void;
  const promise = new Promise<ApiResult<unknown>>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("SystemStatusCard", () => {
  it("shows a checking badge, then Connected", async () => {
    const health = deferred();
    apiCall.mockReturnValue(health.promise);
    render(<SystemStatusCard />);
    expect(apiCall).toHaveBeenCalledWith("/api/health");
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    await act(async () => health.resolve({ ok: true, data: {}, status: 200 }));
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows Unavailable with the error message", async () => {
    apiCall.mockResolvedValue({
      ok: false,
      error: { code: "service_unavailable", message: "Database unavailable" },
      status: 503,
    });
    render(<SystemStatusCard />);
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("ignores a response that arrives after unmount", async () => {
    const health = deferred();
    apiCall.mockReturnValue(health.promise);
    const errors = vi.spyOn(console, "error");
    const { unmount } = render(<SystemStatusCard />);
    unmount();
    await act(async () => health.resolve({ ok: true, data: {}, status: 200 }));
    expect(errors).not.toHaveBeenCalled();
  });
});
