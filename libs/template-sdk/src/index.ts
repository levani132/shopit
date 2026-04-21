// Types
export type {
  LocalizedText,
  StoreData,
  CategoryData,
  SubcategoryData,
  HomepageProduct,
  HomePageProps,
  ProductsPageProps,
  ProductDetailPageProps,
  AboutPageProps,
  CartPageProps,
  CheckoutPageProps,
  WishlistPageProps,
  OrdersPageProps,
  StatusPageProps,
  AuthPageProps,
  CustomPageProps,
  LayoutWrapperProps,
  HeaderProps,
  FooterProps,
  TemplateDefinition,
  TemplateAttributeType,
  TemplateAttributeDefinition,
} from './types/template.types.js';

export type { TemplateManifest } from './types/manifest.types.js';

// Utilities
export { getLocalizedText, formatPrice, defineTemplate } from './utils/index.js';
export { validateManifest } from './utils/validate-manifest.js';

// Hooks
export {
  useStoreData,
  useCart,
  useLocale,
  useTemplateConfig,
  StoreDataProvider,
  CartProvider,
  LocaleProvider,
  TemplateConfigProvider,
} from './hooks/index.jsx';
export type { CartItem } from './hooks/index.jsx';

// Components
export { PriceDisplay } from './components/PriceDisplay.jsx';
export { ProductImage } from './components/ProductImage.jsx';
