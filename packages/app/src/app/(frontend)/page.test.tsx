import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page.tsx";

describe("HomePage", () => {
  it("renders the hero, the admin link and every feature card", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Grow as a developer with mentors who have shipped it before.",
    );
    expect(screen.getByRole("link", { name: "Open the admin panel" })).toHaveAttribute("href", "/admin");
    const features = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(features).toEqual(["Guided learning paths", "1:1 mentoring", "Progress you can see"]);
  });
});
