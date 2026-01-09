# Styling Patterns

## Overview

The app uses:
- **Tailwind CSS** for utility classes
- **CSS Variables** for theming (accent colors, dark mode)
- **Inline styles** for dynamic values

## Global CSS

File: `apps/web/src/app/global.css`

Contains:
- Tailwind imports
- CSS variable definitions
- Dark mode styles
- Mobile-specific fixes (iOS zoom prevention)

## Dynamic Colors - CRITICAL

**Tailwind's JIT compiler cannot parse dynamic class names.**

### ❌ NEVER DO THIS:
```typescript
// This will BREAK the build
className={`bg-[${color}]`}
className={`text-[var(--accent-${shade})]`}
className="bg-[var(${accentVar}-600)]"
```

### ✅ ALWAYS DO THIS:
```typescript
// Use inline styles for dynamic values
style={{ backgroundColor: color }}
style={{ color: `var(--accent-500)` }}

// Or CSS variables
style={{ '--my-color': color } as React.CSSProperties}
// Then in className: "bg-[var(--my-color)]" (static string!)
```

## CSS Variables

### Main Site (set by AccentColorProvider)
```css
--accent-50 through --accent-900
```

### Store Pages (set by store layout)
```css
--store-accent-50 through --store-accent-900
```

### Dark Mode
```css
--background, --foreground, --card, --border, etc.
```

## Component Patterns

### Buttons with Dynamic Colors
```typescript
<button
  className="px-4 py-2 rounded-lg text-white transition-colors"
  style={{ 
    backgroundColor: isHovered ? colors[700] : colors[600] 
  }}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
```

### Inputs with Focus Ring
```typescript
<input
  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
  style={{ 
    '--tw-ring-color': colors[500] 
  } as React.CSSProperties}
/>
```

### Links with Accent Color
```typescript
<Link 
  href="/somewhere"
  style={{ color: colors[600] }}
  className="hover:underline"
>
```

## Dark Mode

Uses `next-themes` with ThemeProvider.

Toggle component: `apps/web/src/components/theme/ThemeToggle.tsx`

CSS pattern:
```css
.dark .my-element {
  /* dark mode styles */
}
```

Or with Tailwind:
```typescript
className="bg-white dark:bg-gray-900"
```

## Mobile Considerations

### Prevent iOS Input Zoom
In global.css:
```css
@media (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}

html, body {
  touch-action: manipulation;
}
```

### Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
```

