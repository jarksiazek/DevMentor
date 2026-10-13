import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState.tsx";
import { ErrorMessage } from "./ErrorMessage.tsx";
import { LoadingMessage } from "./LoadingMessage.tsx";

describe("EmptyState", () => {
  it("renders the title only when no description or action is given", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders description, action and extra classes", () => {
    const { container } = render(
      <EmptyState title="No users" description="Create one" action={<button>Add</button>} className="extra" />,
    );
    expect(screen.getByText("Create one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("extra", "flex");
  });
});

describe("ErrorMessage", () => {
  it("announces the message as an alert with an optional action", () => {
    render(<ErrorMessage message="Boom" action={<button>Retry</button>} className="extra" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom");
    expect(alert).toHaveClass("extra");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("LoadingMessage", () => {
  it("uses a default label", () => {
    render(<LoadingMessage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("accepts a custom label and classes", () => {
    render(<LoadingMessage label="Fetching users" className="extra" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Fetching users");
    expect(status).toHaveClass("extra");
  });
});
