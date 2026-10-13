import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./frontend.css";

export const metadata: Metadata = {
  title: "DevMentor",
  description: "Mentoring for software developers.",
};

// Root layout for public (frontend) pages: plain Tailwind CSS.
export default function FrontendLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
