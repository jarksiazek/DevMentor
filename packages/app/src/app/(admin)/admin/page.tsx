import { SystemStatusCard } from "./SystemStatusCard";
import { UsersPanel } from "./UsersPanel";

export const metadata = { title: "Dashboard" };

// Static shell: data comes from /api/* through apiCall, so the page needs no
// database at build time.
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">System status and users.</p>
      </div>
      <SystemStatusCard />
      <UsersPanel />
    </div>
  );
}
