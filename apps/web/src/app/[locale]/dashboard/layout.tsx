import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../../../components/dashboard/DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // TODO: Add authentication check and redirect to login if not authenticated
  // For now, we'll allow access to build the UI

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      {/* Header - Full width at top */}
      <DashboardHeader />

      {/* Below header: Sidebar + Content */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <DashboardSidebar />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
