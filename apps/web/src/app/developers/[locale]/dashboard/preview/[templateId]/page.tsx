'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Standalone template preview page.
 * Renders a mock "home page" with sample store data and products
 * so developers can see how their template will look.
 *
 * This page is designed to be embedded in an iframe from the editor.
 *
 * Query params:
 *   ?page=home|products|about|cart|checkout (default: home)
 */

// Inline mock data so this page is fully self-contained
const sampleStore = {
  id: 'store-preview',
  subdomain: 'preview-store',
  name: 'Preview Store',
  nameLocalized: { en: 'Preview Store', ka: 'გადახედვის მაღაზია' },
  description: 'A preview of your template with sample data',
  descriptionLocalized: {
    en: 'A preview of your template with sample data',
    ka: 'თქვენი შაბლონის გადახედვა სატესტო მონაცემებით',
  },
  brandColor: '#1e40af',
  accentColor: '#3b82f6',
  authorName: 'Template Developer',
  authorNameLocalized: { en: 'Template Developer', ka: 'შაბლონის დეველოპერი' },
  showAuthorName: true,
  phone: '+995 555 123 456',
  email: 'dev@shopit.ge',
  address: 'Tbilisi, Georgia',
  socialLinks: { facebook: '#', instagram: '#' },
  categories: [
    {
      _id: 'cat-1',
      name: 'Electronics',
      nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' },
      slug: 'electronics',
      subcategories: [
        { _id: 'sub-1', name: 'Phones', nameLocalized: { en: 'Phones', ka: 'ტელეფონები' }, slug: 'phones' },
      ],
    },
    {
      _id: 'cat-2',
      name: 'Clothing',
      nameLocalized: { en: 'Clothing', ka: 'ტანსაცმელი' },
      slug: 'clothing',
      subcategories: [],
    },
  ],
  isVerified: true,
  courierType: 'platform',
  selfPickupEnabled: true,
};

const placeholderImage =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EProduct%3C/text%3E%3C/svg%3E';

const sampleProducts = [
  {
    _id: 'p1',
    name: 'Wireless Headphones',
    nameLocalized: { en: 'Wireless Headphones', ka: 'უსადენო ყურსასმენი' },
    price: 149.99,
    salePrice: 119.99,
    isOnSale: true,
    images: [placeholderImage],
    stock: 25,
    viewCount: 342,
    categoryId: { name: 'Electronics', nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' } },
  },
  {
    _id: 'p2',
    name: 'Cotton T-Shirt',
    nameLocalized: { en: 'Cotton T-Shirt', ka: 'ბამბის მაისური' },
    price: 29.99,
    isOnSale: false,
    images: [placeholderImage],
    stock: 100,
    hasVariants: true,
    variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }],
    viewCount: 156,
    categoryId: { name: 'Clothing', nameLocalized: { en: 'Clothing', ka: 'ტანსაცმელი' } },
  },
  {
    _id: 'p3',
    name: 'Smart Watch Pro',
    nameLocalized: { en: 'Smart Watch Pro', ka: 'სმარტ საათი პრო' },
    price: 299.99,
    salePrice: 249.99,
    isOnSale: true,
    images: [placeholderImage],
    stock: 15,
    viewCount: 521,
    categoryId: { name: 'Electronics', nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' } },
  },
  {
    _id: 'p4',
    name: 'Ceramic Vase',
    nameLocalized: { en: 'Ceramic Vase', ka: 'კერამიკული ვაზა' },
    price: 45.0,
    isOnSale: false,
    images: [placeholderImage],
    stock: 40,
    viewCount: 89,
    categoryId: { name: 'Home & Garden', nameLocalized: { en: 'Home & Garden', ka: 'სახლი და ბაღი' } },
  },
];

// ---------------------------------------------------------------------------
// Preview page selector — lets the preview switch between mock pages
// ---------------------------------------------------------------------------

type PreviewPage = 'home' | 'products' | 'about' | 'cart' | 'checkout';

function PageSelector({
  current,
  onChange,
}: {
  current: PreviewPage;
  onChange: (page: PreviewPage) => void;
}) {
  const pages: PreviewPage[] = ['home', 'products', 'about', 'cart', 'checkout'];
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#64748b', marginRight: 8, fontWeight: 500 }}>Page:</span>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: current === p ? '1px solid #3b82f6' : '1px solid transparent',
            background: current === p ? '#eff6ff' : 'transparent',
            color: current === p ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            fontWeight: current === p ? 600 : 400,
            fontSize: 13,
            textTransform: 'capitalize',
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock page renderers — demonstrate what template devs will build
// ---------------------------------------------------------------------------

function MockHomePage({ locale }: { locale: string }) {
  const getName = (item: { name: string; nameLocalized?: { en?: string; ka?: string } }) =>
    locale === 'ka' ? item.nameLocalized?.ka || item.name : item.nameLocalized?.en || item.name;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${sampleStore.brandColor}, ${sampleStore.accentColor})`,
          color: '#fff',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
          {getName(sampleStore)}
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9, marginTop: 8 }}>
          {locale === 'ka'
            ? sampleStore.descriptionLocalized?.ka
            : sampleStore.descriptionLocalized?.en}
        </p>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 12, padding: '20px 24px', flexWrap: 'wrap' }}>
        {sampleStore.categories.map((cat) => (
          <div
            key={cat._id}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              borderRadius: 20,
              fontSize: 14,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            {getName(cat)}
          </div>
        ))}
      </div>

      {/* Products grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
          padding: '0 24px 24px',
        }}
      >
        {sampleProducts.map((product) => (
          <div
            key={product._id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <div style={{ width: '100%', height: 160, background: '#f1f5f9', position: 'relative' }}>
              <img
                src={product.images[0]}
                alt={getName(product)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {product.isOnSale && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  SALE
                </span>
              )}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                {getName(product)}
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                {product.isOnSale && product.salePrice ? (
                  <>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
                      {product.salePrice.toFixed(2)} ₾
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: '#94a3b8',
                        textDecoration: 'line-through',
                      }}
                    >
                      {product.price.toFixed(2)} ₾
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    {product.price.toFixed(2)} ₾
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockProductsPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Products</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        This page will show all products with filtering, sorting, and search.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {sampleProducts.map((p) => (
          <div key={p._id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 500 }}>{p.name}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{p.price.toFixed(2)} ₾</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAboutPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>About Us</h2>
      <p style={{ color: '#374151', lineHeight: 1.6 }}>
        {sampleStore.description}
      </p>
      <div style={{ marginTop: 24, fontSize: 14, color: '#64748b' }}>
        <div>📧 {sampleStore.email}</div>
        <div>📞 {sampleStore.phone}</div>
        <div>📍 {sampleStore.address}</div>
      </div>
    </div>
  );
}

function MockCartPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Shopping Cart</h2>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
          <span>{sampleProducts[0].name} × 2</span>
          <span style={{ fontWeight: 600 }}>{(sampleProducts[0].price * 2).toFixed(2)} ₾</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontWeight: 700, fontSize: 16 }}>
          <span>Total</span>
          <span>{(sampleProducts[0].price * 2).toFixed(2)} ₾</span>
        </div>
      </div>
      <button
        style={{
          marginTop: 16,
          padding: '12px 24px',
          background: '#3b82f6',
          color: '#fff',
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Proceed to Checkout
      </button>
    </div>
  );
}

function MockCheckoutPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Checkout</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        This page will show the checkout form with shipping address, payment method selection,
        and the BOG payment integration.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>First Name</label>
          <input
            disabled
            placeholder="John"
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Last Name</label>
          <input
            disabled
            placeholder="Doe"
            style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
        </div>
      </div>
      <button
        style={{
          marginTop: 20,
          padding: '12px 24px',
          background: '#16a34a',
          color: '#fff',
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Pay with BOG →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main preview page
// ---------------------------------------------------------------------------

export default function TemplatePreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const templateId = params?.templateId as string;

  const initialPage = (searchParams?.get('page') as PreviewPage) || 'home';
  const [activePage, setActivePage] = useState<PreviewPage>(initialPage);

  // Listen for page changes from parent (editor) via postMessage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'preview-page-change' && event.data.page) {
        setActivePage(event.data.page);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <PageSelector current={activePage} onChange={setActivePage} />

      {/* Template ID indicator */}
      <div
        style={{
          padding: '6px 12px',
          background: '#fefce8',
          borderBottom: '1px solid #fef08a',
          fontSize: 12,
          color: '#a16207',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Previewing template: <strong>{templateId}</strong> — This is a mock preview with sample data
      </div>

      {/* Render active mock page */}
      {activePage === 'home' && <MockHomePage locale={locale} />}
      {activePage === 'products' && <MockProductsPage />}
      {activePage === 'about' && <MockAboutPage />}
      {activePage === 'cart' && <MockCartPage />}
      {activePage === 'checkout' && <MockCheckoutPage />}
    </div>
  );
}
