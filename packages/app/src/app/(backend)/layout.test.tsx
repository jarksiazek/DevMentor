import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BackendLayout, { metadata } from "./layout.tsx";

describe("BackendLayout", () => {
  it("renders the backend shell around its children", () => {
    const html = renderToStaticMarkup(
      <BackendLayout>
        <p>page content</p>
      </BackendLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="/backend"');
    expect(html).toContain("View site");
    expect(html).toContain('href="/"');
    expect(html).toContain("<p>page content</p>");
    expect(metadata.title).toEqual({ default: "DevMentor backend", template: "%s · DevMentor backend" });
  });
});
