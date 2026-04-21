# @shopit/template-sdk

The official SDK for building ShopIt store templates. External developers use this package to create, test, and publish custom templates for the ShopIt marketplace.

## Installation

```bash
npm install @shopit/template-sdk
```

## What's Included

- **Types** — `TemplateDefinition`, all page/layout prop interfaces, attribute types
- **Hooks** — `useStoreData`, `useCart`, `useLocale`, `useTemplateConfig`
- **Components** — `PriceDisplay`, `ProductImage`
- **Utilities** — `getLocalizedText`, `formatPrice`, `defineTemplate`
- **Mock Providers** — `MockStoreProvider`, sample data for local development

## Quick Start

```tsx
import { defineTemplate, type HomePageProps } from '@shopit/template-sdk';

function HomePage({ store, products, locale }: HomePageProps) {
  return (
    <div>
      <h1>{store.name}</h1>
      {products.map(p => <div key={p._id}>{p.name}</div>)}
    </div>
  );
}

export default defineTemplate({
  id: 'my-template',
  name: 'My Template',
  description: 'A custom ShopIt template',
  version: '1.0.0',
  pages: { home: HomePage, products: ProductsPage, productDetail: DetailPage, about: AboutPage },
  layout: { wrapper: Wrapper, header: Header, footer: Footer },
  attributes: [],
  defaultAttributeValues: {},
});
```

## Testing with Mock Data

```tsx
import { MockStoreProvider } from '@shopit/template-sdk/mock';

function App() {
  return (
    <MockStoreProvider>
      <MyTemplate />
    </MockStoreProvider>
  );
}
```
