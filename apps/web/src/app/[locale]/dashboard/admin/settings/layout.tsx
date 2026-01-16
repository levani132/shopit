import { ReactNode } from 'react';
import { SettingsLayout } from '../../../../../../components/dashboard/admin/SettingsLayout';

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
