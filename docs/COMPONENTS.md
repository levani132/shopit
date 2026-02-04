# UI Components Library

This document describes the ShopIt UI components library and how to use it.

## Overview

The components library (`@shopit/components`) contains reusable React components that are shared across the ShopIt applications. All reusable UI components should be added to this library to ensure consistency and maintainability.

**Location:** `libs/ui/components/`

## Storybook

The component library uses [Storybook](https://storybook.js.org/) for component development and documentation.

### Running Storybook

```bash
# Run Storybook standalone
npm run storybook

# Run with the full dev environment (web + api + storybook)
npm run dev
```

Storybook runs on **http://localhost:4400**

### Building Storybook

```bash
npm run build-storybook
```

The built Storybook is output to `dist/storybook/components/`.

## Component Structure

Each component should follow this directory structure:

```
libs/ui/components/src/lib/
├── ComponentName/
│   ├── ComponentName.tsx      # Main component file
│   ├── ComponentName.stories.tsx  # Storybook stories
│   ├── ComponentName.spec.tsx # Unit tests (optional)
│   └── index.ts               # Exports
```

## Available Components

### Logo

**Import:** `import { Logo } from '@shopit/components';`

The Logo component is the primary brand identity element for ShopIt.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'md'` | Size of the logo |
| `variant` | `'full' \| 'icon' \| 'wordmark'` | `'full'` | Which parts of the logo to display |
| `colorScheme` | `'brand' \| 'light' \| 'dark' \| 'monochrome' \| 'gradient'` | `'brand'` | Color scheme |
| `animated` | `boolean` | `false` | Enable hover animations |
| `loading` | `boolean` | `false` | Show loading/pulse animation |
| `clickable` | `boolean` | `false` | Make logo clickable |
| `tagline` | `string` | - | Optional tagline below the wordmark |
| `onClick` | `() => void` | - | Click handler |

#### Usage Examples

```tsx
// Basic usage
<Logo />

// Large logo with tagline
<Logo size="xl" tagline="Your marketplace, your way" />

// Icon only (for favicons, app icons)
<Logo variant="icon" size="lg" />

// Light theme for dark backgrounds
<Logo colorScheme="light" size="md" />

// Clickable animated logo
<Logo clickable animated onClick={() => navigate('/')} />
```

### Button

**Import:** `import { Button } from '@shopit/components';`

A versatile button component with multiple variants, sizes, and states.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Button size |
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'link'` | `'solid'` | Visual style |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'danger' \| 'warning'` | `'primary'` | Color scheme |
| `fullWidth` | `boolean` | `false` | Full width button |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable the button |
| `leftIcon` | `ReactNode` | - | Icon before text |
| `rightIcon` | `ReactNode` | - | Icon after text |
| `iconOnly` | `boolean` | `false` | Icon-only button |

#### Usage Examples

```tsx
// Basic buttons
<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// With icons
<Button leftIcon={<PlusIcon />}>Add Item</Button>
<Button rightIcon={<ArrowRightIcon />}>Continue</Button>

// Colors
<Button color="success">Save</Button>
<Button color="danger">Delete</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

## Creating New Components

### 1. Create the component directory

```bash
mkdir -p libs/ui/components/src/lib/MyComponent
```

### 2. Create the component file

`libs/ui/components/src/lib/MyComponent/MyComponent.tsx`:

```tsx
import React from 'react';

export interface MyComponentProps {
  /** Description of the prop */
  propName?: string;
}

/**
 * MyComponent description for documentation.
 */
export function MyComponent({ propName = 'default' }: MyComponentProps) {
  return (
    <div className="...">
      {/* Component implementation */}
    </div>
  );
}

export default MyComponent;
```

### 3. Create Storybook stories

`libs/ui/components/src/lib/MyComponent/MyComponent.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    propName: {
      control: 'text',
      description: 'Description of the prop',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    propName: 'example',
  },
};

export const Variant: Story = {
  args: {
    propName: 'variant example',
  },
};
```

### 4. Create the index file

`libs/ui/components/src/lib/MyComponent/index.ts`:

```tsx
export { MyComponent, type MyComponentProps } from './MyComponent';
```

### 5. Export from the library

Add to `libs/ui/components/src/index.ts`:

```tsx
export * from './lib/MyComponent';
```

## Best Practices

### Component Design

1. **Use TypeScript** - All components should be fully typed with proper interfaces
2. **Document props** - Use JSDoc comments on prop interfaces for auto-documentation
3. **Support theming** - Use Tailwind CSS classes and support dark mode
4. **Accessibility** - Include proper ARIA attributes, keyboard navigation, and focus states
5. **Responsive** - Components should work across different screen sizes

### Storybook Stories

1. **Write comprehensive stories** - Cover all variants, sizes, and states
2. **Use autodocs** - Add `tags: ['autodocs']` for automatic documentation
3. **Add descriptions** - Use `parameters.docs.description` to explain use cases
4. **Show real examples** - Include stories that show components in context

### Naming Conventions

- Component names: `PascalCase` (e.g., `MyComponent`)
- Story names: `PascalCase` (e.g., `WithIcon`)
- Props: `camelCase` (e.g., `onClick`)
- CSS classes: Use Tailwind utilities

## Integration with Nx

The components library is part of the Nx workspace and can be imported in other projects:

```tsx
// In apps/web
import { Logo, Button } from '@shopit/components';
```

### Nx Commands

```bash
# Run Storybook
npx nx storybook components

# Build Storybook
npx nx build-storybook components

# Run tests
npx nx test components

# Lint
npx nx lint components
```

## Tailwind Configuration

The components library has its own Tailwind configuration at `libs/ui/components/tailwind.config.js` that extends the base theme with brand colors and custom utilities.

When using components in consuming applications, ensure your Tailwind config includes the component library paths:

```js
// apps/web/tailwind.config.js
module.exports = {
  content: [
    // ... your app paths
    '../../libs/ui/components/src/**/*.{ts,tsx}',
  ],
  // ...
};
```
