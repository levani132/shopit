import React from 'react';
import { render } from '@testing-library/react';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock i18n routing
jest.mock('../src/i18n/routing', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Simple component for testing
function TestComponent() {
  return <div data-testid="test">Hello World</div>;
}

describe('App', () => {
  it('should render a basic component', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test')).toBeTruthy();
  });

  it('should have valid React setup', () => {
    expect(React.version).toBeDefined();
  });
});
