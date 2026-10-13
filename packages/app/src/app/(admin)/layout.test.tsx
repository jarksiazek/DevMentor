import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLayout, { metadata } from "./layout.tsx";

describe("AdminLayout", () => {
  it("renders the admin shell around its children", () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <p>page content</p>
      </AdminLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="/admin"');
    expect(html).toContain("View site");
    expect(html).toContain('href="/"');
    expect(html).toContain("<p>page content</p>");
    expect(metadata.title).toEqual({ default: "DevMentor admin", template: "%s · DevMentor admin" });
  });
});
