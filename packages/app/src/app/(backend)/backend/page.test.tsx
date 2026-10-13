import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./SystemStatusCard.tsx", () => ({ SystemStatusCard: () => <div>status card</div> }));
vi.mock("./UsersPanel.tsx", () => ({ UsersPanel: () => <div>users panel</div> }));

const { default: BackendDashboardPage, metadata } = await import("./page.tsx");

describe("BackendDashboardPage", () => {
  it("renders the dashboard heading with the status and users panels", () => {
    render(<BackendDashboardPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("System status and users.")).toBeInTheDocument();
    expect(screen.getByText("status card")).toBeInTheDocument();
    expect(screen.getByText("users panel")).toBeInTheDocument();
    expect(metadata).toEqual({ title: "Dashboard" });
  });
});
