/**
 * Complete type declarations for @shopit/template-sdk.
 * Used by the Monaco editor to provide IntelliSense / autocomplete.
 *
 * Keep in sync with libs/template-sdk/src/types/*.ts and hooks/utils/components.
 */
export const TEMPLATE_SDK_DTS = `
declare module '@shopit/template-sdk' {
  import { ReactNode, ComponentType, CSSProperties } from 'react';

  // ── Bilingual text ──
  export interface LocalizedText {
    ka?: string;
    en?: string;
  }

  // ── Store data ──
  export interface StoreData {
    id: string;
    subdomain: string;
    name: string;
    nameLocalized?: LocalizedText;
    description?: string;
    descriptionLocalized?: LocalizedText;
    aboutUs?: string;
    aboutUsLocalized?: LocalizedText;
    logo?: string;
    coverImage?: string;
    brandColor: string;
    accentColor: string;
    useInitialAsLogo?: boolean;
    useDefaultCover?: boolean;
    authorName?: string;
    authorNameLocalized?: LocalizedText;
    showAuthorName?: boolean;
    phone?: string;
    email?: string;
    address?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    };
    categories?: CategoryData[];
    isVerified?: boolean;
    homepageProductOrder?: string;
    courierType?: string;
    selfPickupEnabled?: boolean;
    location?: { lat: number; lng: number };
  }

  export interface CategoryData {
    _id: string;
    name: string;
    nameLocalized?: LocalizedText;
    slug: string;
    subcategories: SubcategoryData[];
  }

  export interface SubcategoryData {
    _id: string;
    name: string;
    nameLocalized?: LocalizedText;
    slug: string;
  }

  export interface HomepageProduct {
    _id: string;
    name: string;
    nameLocalized?: LocalizedText;
    price: number;
    salePrice?: number;
    isOnSale: boolean;
    images: string[];
    stock: number;
    totalStock?: number;
    hasVariants?: boolean;
    variants?: unknown[];
    viewCount?: number;
    categoryId?: { name: string; nameLocalized?: LocalizedText };
    description?: string;
    descriptionLocalized?: LocalizedText;
  }

  // ── Page prop interfaces ──
  export interface HomePageProps {
    store: StoreData;
    products: HomepageProduct[];
    hasMoreProducts: boolean;
    locale: string;
    subdomain: string;
    storeInitial: string;
    authorInitial: string;
  }

  export interface ProductsPageProps {
    store: StoreData;
    products: HomepageProduct[];
    locale: string;
    subdomain: string;
  }

  export interface ProductDetailPageProps {
    locale: string;
    subdomain: string;
    productId: string;
  }

  export interface AboutPageProps {
    locale: string;
    subdomain: string;
  }

  export interface CartPageProps {
    locale: string;
    subdomain: string;
  }

  export interface CheckoutPageProps {
    locale: string;
    subdomain: string;
  }

  export interface WishlistPageProps {
    locale: string;
    subdomain: string;
  }

  export interface OrdersPageProps {
    locale: string;
    subdomain: string;
  }

  export interface StatusPageProps {
    locale: string;
    subdomain: string;
    orderId?: string | null;
  }

  export interface AuthPageProps {
    locale: string;
    subdomain: string;
  }

  export interface CustomPageProps {
    locale: string;
    subdomain: string;
    slug: string[];
  }

  // ── Layout prop interfaces ──
  export interface LayoutWrapperProps {
    store: {
      id?: string;
      name: string;
      subdomain: string;
      description?: string;
      logo?: string;
      authorName?: string;
      showAuthorName?: boolean;
      phone?: string;
      email?: string;
      address?: string;
      socialLinks?: StoreData['socialLinks'];
      categories?: CategoryData[];
      initial?: string;
      authorInitial?: string;
    };
    accentColors: CSSProperties;
    locale: string;
    children: ReactNode;
  }

  export interface HeaderProps {
    store: LayoutWrapperProps['store'];
  }

  export interface FooterProps {
    store: LayoutWrapperProps['store'];
    locale: string;
  }

  // ── Template definition ──
  export interface TemplateDefinition {
    id: string;
    name: string;
    description: string;
    version: string;
    pages: {
      home: ComponentType<HomePageProps>;
      products: ComponentType<ProductsPageProps>;
      productDetail: ComponentType<ProductDetailPageProps>;
      about: ComponentType<AboutPageProps>;
    };
    optionalPages?: {
      cart?: ComponentType<CartPageProps>;
      checkout?: ComponentType<CheckoutPageProps>;
      wishlist?: ComponentType<WishlistPageProps>;
      orders?: ComponentType<OrdersPageProps>;
      checkoutSuccess?: ComponentType<StatusPageProps>;
      checkoutFail?: ComponentType<StatusPageProps>;
      login?: ComponentType<AuthPageProps>;
      register?: ComponentType<AuthPageProps>;
      comingSoon?: ComponentType<StatusPageProps>;
      notFound?: ComponentType<StatusPageProps>;
    };
    customPages?: Record<string, ComponentType<CustomPageProps>>;
    layout: {
      wrapper: ComponentType<LayoutWrapperProps>;
      header: ComponentType<HeaderProps>;
      footer: ComponentType<FooterProps>;
    };
    attributes: TemplateAttributeDefinition[];
    defaultAttributeValues: Record<string, unknown>;
  }

  // ── Template attributes ──
  export type TemplateAttributeType =
    | 'boolean' | 'string' | 'number' | 'select'
    | 'color' | 'image' | 'rich-text' | 'font' | 'spacing';

  export interface TemplateAttributeDefinition {
    key: string;
    label: string | LocalizedText;
    description?: string | LocalizedText;
    type: TemplateAttributeType;
    group?: string;
    default: unknown;
    options?: (string | { value: string; label: LocalizedText })[];
    validation?: {
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: string;
    };
    showIf?: { key: string; value: unknown };
  }

  // ── Template manifest ──
  export interface TemplateManifest {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    version: string;
    author: string;
    sdkVersion: string;
    category: 'general' | 'fashion' | 'electronics' | 'food' | 'services' | 'handmade' | 'other';
    tags?: string[];
    pricing: {
      type: 'free' | 'one-time' | 'subscription';
      price?: number;
      monthlyPrice?: number;
    };
    assets: {
      thumbnail: string;
      screenshots?: string[];
      previewVideo?: string;
    };
    main: string;
    attributes?: TemplateAttributeDefinition[];
    pages: ('home' | 'products' | 'productDetail' | 'about')[];
    optionalPages?: ('cart' | 'checkout' | 'wishlist' | 'orders' | 'checkoutSuccess' | 'checkoutFail' | 'login' | 'register' | 'comingSoon' | 'notFound')[];
    customPages?: string[];
    changelog?: { version: string; date: string; changes: string[] }[];
  }

  // ── Cart ──
  export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }

  interface CartContextValue {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
  }

  // ── Hooks ──
  export function useStoreData(): StoreData;
  export function useCart(): CartContextValue;
  export function useLocale(): string;
  export function useTemplateConfig(): Record<string, unknown>;

  // ── Providers ──
  export function StoreDataProvider(props: { store: StoreData; children: ReactNode }): JSX.Element;
  export function CartProvider(props: { value: CartContextValue; children: ReactNode }): JSX.Element;
  export function LocaleProvider(props: { locale: string; children: ReactNode }): JSX.Element;
  export function TemplateConfigProvider(props: { config: Record<string, unknown>; children: ReactNode }): JSX.Element;

  // ── Components ──
  export function PriceDisplay(props: {
    price: number;
    salePrice?: number;
    isOnSale?: boolean;
    locale?: string;
    className?: string;
  }): JSX.Element;

  export function ProductImage(props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    style?: CSSProperties;
  }): JSX.Element;

  // ── Utilities ──
  export function defineTemplate(template: TemplateDefinition): TemplateDefinition;
  export function validateManifest(manifest: unknown): { valid: boolean; errors: { path: string; message: string }[] };
  export function getLocalizedText(localized: LocalizedText | undefined, fallback: string | undefined, locale: string): string;
  export function formatPrice(price: number, locale?: string): string;
}
`;

/**
 * Minimal React type stubs so semantic validation doesn't flag JSX usage.
 * This is a slimmed-down version of @types/react — just enough for templates.
 */
export const REACT_DTS = `
declare module 'react' {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: string | null;
  }
  export type JSXElementConstructor<P> = (props: P) => ReactElement<any, any> | null;
  export type ComponentType<P = {}> = (props: P) => ReactElement | null;
  export type FC<P = {}> = ComponentType<P>;
  export type CSSProperties = Record<string, string | number | undefined>;
  export type ReactElement<P = any> = { type: any; props: P; key: string | null };
  export type Ref<T> = { current: T | null } | ((instance: T | null) => void);
  export type RefObject<T> = { current: T | null };
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];

  // Hooks
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: unknown[]): T;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void];
  export function useId(): string;

  // Context
  export interface Context<T> {
    Provider: ComponentType<{ value: T; children?: ReactNode }>;
    Consumer: ComponentType<{ children: (value: T) => ReactNode }>;
  }
  export function createContext<T>(defaultValue: T): Context<T>;

  // Elements
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  export function cloneElement(element: ReactElement, props?: any, ...children: any[]): ReactElement;
  export function isValidElement(object: any): object is ReactElement;
  export const Fragment: symbol;
  export const StrictMode: ComponentType<{ children?: ReactNode }>;

  // Children
  export const Children: {
    map<T, C>(children: C | C[], fn: (child: C, index: number) => T): T[];
    forEach<C>(children: C | C[], fn: (child: C, index: number) => void): void;
    count(children: any): number;
    only(children: any): ReactElement;
    toArray(children: any): ReactElement[];
  };

  export type FormEvent<T = Element> = { target: T; preventDefault: () => void; stopPropagation: () => void };
  export type ChangeEvent<T = Element> = { target: T & { value: string; checked: boolean } };
  export type MouseEvent<T = Element> = { target: T; preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number };
  export type KeyboardEvent<T = Element> = { target: T; key: string; code: string; preventDefault: () => void };

  export type HTMLAttributes<T> = Record<string, any>;
  export type DetailedHTMLProps<E, T> = E & { ref?: Ref<T> };
}

declare module 'react-dom' {
  export function createRoot(container: Element | DocumentFragment): { render(element: any): void; unmount(): void };
  export function render(element: any, container: Element | DocumentFragment): void;
  export function unmountComponentAtNode(container: Element): boolean;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(element: any): void; unmount(): void };
  export function hydrateRoot(container: Element | DocumentFragment, initialChildren: any): { render(element: any): void; unmount(): void };
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: string): any;
  export function jsxs(type: any, props: any, key?: string): any;
  export const Fragment: symbol;
}

declare namespace JSX {
  interface Element extends React.ReactElement<any, any> {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;
