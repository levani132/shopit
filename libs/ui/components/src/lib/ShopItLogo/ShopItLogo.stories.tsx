import type { Meta, StoryObj } from '@storybook/react';
import { ShopItLogo, ShopItIcon } from './ShopItLogo';

const meta: Meta<typeof ShopItLogo> = {
  title: 'Brand/ShopItLogo',
  component: ShopItLogo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The ShopItLogo component is the primary brand identity element for ShopIt.
It features a shopping bag icon with the "S" letter and optional text.

## Features
- **4 sizes**: sm, md, lg, xl
- **3 variants**: auto (follows theme), light (for dark backgrounds), dark (for light backgrounds)
- **Theming**: Supports store accent colors via CSS variables
- **Icon-only version**: ShopItIcon for compact spaces
        `,
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Controls the overall size of the logo',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    showText: {
      control: 'boolean',
      description: 'Whether to show the "ShopIt" text next to the icon',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    variant: {
      control: 'select',
      options: ['auto', 'light', 'dark'],
      description: 'Color variant for different backgrounds',
      table: {
        defaultValue: { summary: 'auto' },
      },
    },
    useStoreAccent: {
      control: 'boolean',
      description: 'Use store accent color instead of global accent',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ShopItLogo>;

/**
 * The default logo configuration with medium size and auto variant.
 */
export const Default: Story = {
  args: {
    size: 'md',
    showText: true,
    variant: 'auto',
  },
};

/**
 * All available sizes from small to extra large.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-gray-500">sm</span>
        <ShopItLogo size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-gray-500">md</span>
        <ShopItLogo size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-gray-500">lg</span>
        <ShopItLogo size="lg" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-gray-500">xl</span>
        <ShopItLogo size="xl" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The logo is available in 4 different sizes to fit various use cases.',
      },
    },
  },
};

/**
 * The three available color variants.
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="p-4 bg-white rounded-lg border">
        <span className="text-xs text-gray-500 block mb-2">
          Auto (follows theme)
        </span>
        <ShopItLogo variant="auto" size="lg" />
      </div>
      <div className="p-4 bg-gray-900 rounded-lg">
        <span className="text-xs text-gray-400 block mb-2">
          Light (for dark backgrounds)
        </span>
        <ShopItLogo variant="light" size="lg" />
      </div>
      <div className="p-4 bg-gray-100 rounded-lg">
        <span className="text-xs text-gray-500 block mb-2">
          Dark (for light backgrounds)
        </span>
        <ShopItLogo variant="dark" size="lg" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Use `auto` for theme-following, `light` for dark backgrounds, and `dark` for light backgrounds.',
      },
    },
  },
};

/**
 * Logo with and without text.
 */
export const WithAndWithoutText: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-600">
          With Text (default)
        </span>
        <ShopItLogo size="lg" showText={true} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-600">Without Text</span>
        <ShopItLogo size="lg" showText={false} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The text can be hidden for icon-only contexts.',
      },
    },
  },
};

/**
 * ShopItIcon component for compact spaces.
 */
export const IconOnly: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <ShopItIcon size={24} />
      <ShopItIcon size={32} />
      <ShopItIcon size={40} />
      <ShopItIcon size={52} />
      <ShopItIcon size={64} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The ShopItIcon component is a standalone icon for favicons, app icons, and space-constrained layouts.',
      },
    },
  },
};

/**
 * Header usage example.
 */
export const HeaderExample: Story = {
  render: () => (
    <div className="w-full max-w-4xl border rounded-lg shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <ShopItLogo size="sm" />
        <nav className="flex gap-4 text-sm text-gray-600">
          <span className="hover:text-indigo-600 cursor-pointer">Products</span>
          <span className="hover:text-indigo-600 cursor-pointer">
            Categories
          </span>
          <span className="hover:text-indigo-600 cursor-pointer">About</span>
        </nav>
      </header>
      <div className="p-8 bg-gray-50 text-center text-gray-400">
        Page content goes here...
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Example of how the logo appears in a typical header navigation.',
      },
    },
  },
};

/**
 * Dark mode / footer example.
 */
export const DarkModeExample: Story = {
  render: () => (
    <div className="p-8 bg-gray-900 rounded-lg">
      <div className="flex flex-col gap-6">
        <ShopItLogo variant="light" size="lg" />
        <div className="flex gap-4">
          <ShopItLogo variant="light" size="sm" showText={false} />
          <ShopItLogo variant="light" size="sm" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story:
          'Use the `light` variant when displaying the logo on dark backgrounds.',
      },
    },
  },
};

/**
 * All available accent colors.
 * The logo color is determined by CSS variables --accent-500 and --accent-700.
 */
export const AccentColors: Story = {
  render: () => {
    // Define all available accent colors with their hex values
    const accentColors = {
      indigo: { 500: '#6366f1', 700: '#4338ca' },
      pink: { 500: '#ec4899', 700: '#be185d' },
      emerald: { 500: '#10b981', 700: '#047857' },
      amber: { 500: '#f59e0b', 700: '#b45309' },
      blue: { 500: '#3b82f6', 700: '#1d4ed8' },
      purple: { 500: '#a855f7', 700: '#7e22ce' },
      red: { 500: '#ef4444', 700: '#b91c1c' },
      teal: { 500: '#14b8a6', 700: '#0f766e' },
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Object.entries(accentColors).map(([name, shades]) => (
          <div
            key={name}
            className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border shadow-sm"
            style={
              {
                '--accent-500': shades[500],
                '--accent-700': shades[700],
                '--store-accent-500': shades[500],
                '--store-accent-700': shades[700],
              } as React.CSSProperties
            }
          >
            <ShopItLogo size="lg" />
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: shades[500] }}
              />
              <span className="text-sm font-medium capitalize text-gray-700">
                {name}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'The logo adapts to the accent color defined by CSS variables. These colors are typically set by the AccentColorProvider or store brand settings.',
      },
    },
  },
};

/**
 * Accent colors on dark background.
 */
export const AccentColorsDark: Story = {
  render: () => {
    const accentColors = {
      indigo: { 500: '#6366f1', 700: '#4338ca' },
      pink: { 500: '#ec4899', 700: '#be185d' },
      emerald: { 500: '#10b981', 700: '#047857' },
      amber: { 500: '#f59e0b', 700: '#b45309' },
      blue: { 500: '#3b82f6', 700: '#1d4ed8' },
      purple: { 500: '#a855f7', 700: '#7e22ce' },
      red: { 500: '#ef4444', 700: '#b91c1c' },
      teal: { 500: '#14b8a6', 700: '#0f766e' },
    };

    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(accentColors).map(([name, shades]) => (
            <div
              key={name}
              className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-lg"
              style={
                {
                  '--accent-500': shades[500],
                  '--accent-700': shades[700],
                  '--store-accent-500': shades[500],
                  '--store-accent-700': shades[700],
                } as React.CSSProperties
              }
            >
              <ShopItLogo size="lg" variant="light" />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: shades[500] }}
                />
                <span className="text-sm font-medium capitalize text-gray-300">
                  {name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Accent colors with the light variant on dark backgrounds.',
      },
    },
  },
};

/**
 * Footer usage example.
 */
export const FooterExample: Story = {
  render: () => (
    <div className="w-full max-w-4xl">
      <footer className="px-8 py-12 bg-gray-900 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col gap-3">
            <ShopItLogo variant="light" size="md" />
            <p className="text-gray-400 text-sm max-w-xs">
              The modern marketplace platform for buyers and sellers.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-white font-medium text-sm">Company</span>
              <span className="text-gray-400 text-sm hover:text-white cursor-pointer">
                About
              </span>
              <span className="text-gray-400 text-sm hover:text-white cursor-pointer">
                Careers
              </span>
              <span className="text-gray-400 text-sm hover:text-white cursor-pointer">
                Contact
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white font-medium text-sm">Legal</span>
              <span className="text-gray-400 text-sm hover:text-white cursor-pointer">
                Privacy
              </span>
              <span className="text-gray-400 text-sm hover:text-white cursor-pointer">
                Terms
              </span>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          © 2026 ShopIt. All rights reserved.
        </div>
      </footer>
    </div>
  ),
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'gray' },
    docs: {
      description: {
        story:
          'Example of the logo in a footer context with the light variant.',
      },
    },
  },
};
