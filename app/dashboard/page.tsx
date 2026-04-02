import DashboardClient from "@frontend/components/DashboardClient";

/** Dashboard — thin shell that delegates all rendering to the client component. */
export default function DashboardPage() {
  return <DashboardClient />;
}
