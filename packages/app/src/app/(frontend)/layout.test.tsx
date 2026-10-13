import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FrontendLayout, { metadata } from "./layout.tsx";

describe("FrontendLayout", () => {
  it("renders the public shell around its children", () => {
    const html = renderToStaticMarkup(
      <FrontendLayout>
        <p>page content</p>
      </FrontendLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<p>page content</p>");
    expect(metadata).toEqual({ title: "DevMentor", description: "Mentoring for software developers." });
  });
});
