import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import { DashboardMobileNav } from '../../../components/dashboard/DashboardMobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Add authentication check and redirect to login if not authenticated
  // For now, we'll allow access to build the UI

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Navigation */}
        <DashboardMobileNav />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

