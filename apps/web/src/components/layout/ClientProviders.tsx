'use client';

import { ThemeProvider } from '../theme/ThemeProvider';
import { AccentColorProvider } from '../theme/AccentColorProvider';
import { AuthProvider } from '../../contexts/AuthContext';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <AccentColorProvider>
        <AuthProvider>{children}</AuthProvider>
      </AccentColorProvider>
    </ThemeProvider>
  );
}
