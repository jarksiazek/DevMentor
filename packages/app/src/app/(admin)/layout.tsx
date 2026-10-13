import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./admin.css";

export const metadata: Metadata = {
  title: { default: "DevMentor admin", template: "%s · DevMentor admin" },
};

// Root layout for admin pages: shadcn-ui components from @devmentor/ui.
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/admin" className="font-semibold">
              DevMentor <span className="text-muted-foreground font-normal">admin</span>
            </Link>
            <Link href="/" className="text-muted-foreground text-sm hover:underline">
              View site
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
