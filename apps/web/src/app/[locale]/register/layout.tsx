import { ReactNode } from 'react';

export default function RegisterLayout({ children }: { children: ReactNode }) {
  // This layout removes the Header and Footer for registration pages
  // The parent layout's Header/Footer need to be conditionally hidden
  return <>{children}</>;
}

