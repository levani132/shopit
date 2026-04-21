'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '../../../../../lib/api';

// ---------------------------------------------------------------------------
// Mock data for SDK props (store, products, etc.)
// ---------------------------------------------------------------------------

const MOCK_STORE_JSON = JSON.stringify({
  name: 'Preview Store',
  nameLocalized: { en: 'Preview Store', ka: 'გადახედვის მაღაზია' },
  description: 'A beautifully designed store',
  logo: '',
  brandColor: '#1e40af',
  accentColor: '#3b82f6',
  phone: '+995 555 123 456',
  email: 'hello@store.ge',
  address: 'Tbilisi, Georgia',
  categories: [
    { _id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    { _id: 'cat-2', name: 'Clothing', slug: 'clothing' },
  ],
});

const MOCK_PRODUCTS_JSON = JSON.stringify([
  {
    _id: 'p1',
    name: 'Wireless Headphones',
    price: 149.99,
    salePrice: 119.99,
    isOnSale: true,
    images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EHeadphones%3C/text%3E%3C/svg%3E'],
    stock: 25,
  },
  {
    _id: 'p2',
    name: 'Cotton T-Shirt',
    price: 29.99,
    isOnSale: false,
    images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3ET-Shirt%3C/text%3E%3C/svg%3E'],
    stock: 100,
  },
  {
    _id: 'p3',
    name: 'Smart Watch Pro',
    price: 299.99,
    salePrice: 249.99,
    isOnSale: true,
    images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EWatch%3C/text%3E%3C/svg%3E'],
    stock: 15,
  },
  {
    _id: 'p4',
    name: 'Ceramic Vase',
    price: 45.0,
    isOnSale: false,
    images: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EVase%3C/text%3E%3C/svg%3E'],
    stock: 40,
  },
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip import/export statements so the code can run in a vanilla script context */
function cleanSource(source: string): string {
  return (
    source
      // Remove import statements (single and multi-line)
      .replace(/^import\s[\s\S]*?from\s+['"][^'"]*['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]*['"];?\s*$/gm, '')
      // Change `export function` / `export default function` → `function`
      .replace(/export\s+default\s+function\s/g, 'function ')
      .replace(/export\s+function\s/g, 'function ')
      // Change `export const` → `const`
      .replace(/export\s+const\s/g, 'const ')
  );
}

/** Extract the first function/component name from source */
function findComponentName(source: string): string | null {
  const match = source.match(
    /(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w*)/,
  );
  return match ? match[1] : null;
}

/** Escape backticks and backslashes for embedding in template literals */
function escapeForTemplate(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/** Build the srcdoc HTML that renders the template with React + Babel standalone */
function buildSrcdoc(
  pageSource: string,
  headerSource: string,
  footerSource: string,
  wrapperSource: string,
  pageComponentName: string,
  headerComponentName: string | null,
  footerComponentName: string | null,
  wrapperComponentName: string | null,
  locale: string,
): string {
  const cleanedPage = escapeForTemplate(cleanSource(pageSource));
  const cleanedHeader = headerSource
    ? escapeForTemplate(cleanSource(headerSource))
    : '';
  const cleanedFooter = footerSource
    ? escapeForTemplate(cleanSource(footerSource))
    : '';
  const cleanedWrapper = wrapperSource
    ? escapeForTemplate(cleanSource(wrapperSource))
    : '';

  const headerRender = headerComponentName
    ? `<${headerComponentName} store={store} locale={locale} />`
    : '';
  const footerRender = footerComponentName
    ? `<${footerComponentName} store={store} locale={locale} />`
    : '';

  const pageRender = `<${pageComponentName} store={store} products={products} locale={locale} subdomain="preview-store" />`;

  const bodyContent = wrapperComponentName
    ? `<${wrapperComponentName} store={store} accentColors={{}} locale={locale}>${headerRender}<main style={{flex:1}}>${pageRender}</main>${footerRender}</${wrapperComponentName}>`
    : `<div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>${headerRender}<main style={{flex:1}}>${pageRender}</main>${footerRender}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #__error { display: none; padding: 2rem; color: #dc2626; font-size: 14px; white-space: pre-wrap; font-family: monospace; }
    #__loading { display: flex; align-items: center; justify-content: center; height: 100vh; }
    #__loading .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="root"><div id="__loading"><div class="spinner"></div></div></div>
  <div id="__error"></div>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>

  <script>
    // Mock SDK: PriceDisplay component
    function PriceDisplay(props) {
      if (props.isOnSale && props.salePrice != null) {
        return React.createElement('span', null,
          React.createElement('span', { style: { color: '#ef4444', fontWeight: 'bold' } }, props.salePrice.toFixed(2) + ' \\u20BE'),
          ' ',
          React.createElement('span', { style: { textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.875em' } }, props.price.toFixed(2) + ' \\u20BE')
        );
      }
      return React.createElement('span', { style: { fontWeight: 'bold' } }, (props.price || 0).toFixed(2) + ' \\u20BE');
    }

    // Mock SDK: defineTemplate just returns its argument
    function defineTemplate(config) { return config; }

    // Mock data
    var store = ${MOCK_STORE_JSON};
    var products = ${MOCK_PRODUCTS_JSON};
    var locale = '${locale}';
  </script>

  <script type="text/babel" data-presets="react,typescript">
    // ---------- Layout components ----------
    ${cleanedWrapper}

    ${cleanedHeader}

    ${cleanedFooter}

    // ---------- Page component ----------
    ${cleanedPage}

    // ---------- Render ----------
    try {
      const App = () => (
        ${bodyContent}
      );
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    } catch (err) {
      document.getElementById('root').style.display = 'none';
      const errEl = document.getElementById('__error');
      errEl.style.display = 'block';
      errEl.textContent = 'Render error: ' + err.message;
    }
  </script>

  <script>
    // Fallback: if Babel/React fails to load, show error after timeout
    setTimeout(function() {
      if (!window.React || !window.Babel) {
        document.getElementById('root').innerHTML = '';
        var errEl = document.getElementById('__error');
        errEl.style.display = 'block';
        errEl.textContent = 'Failed to load preview dependencies. Check your network connection.';
      }
    }, 10000);
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplatePreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const templateId = params?.templateId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [srcdoc, setSrcdoc] = useState('');
  const [activePage, setActivePage] = useState(
    searchParams?.get('page') || 'home',
  );

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

  const buildPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch file list
      const filesData = await api.get(
        `/developers/templates/${templateId}/git/files`,
      );
      const files: { path: string; type: string }[] = Array.isArray(filesData)
        ? filesData
        : filesData.files || [];

      // 2. Find page files and layout files
      const pageFiles = files.filter(
        (f) =>
          f.path.startsWith('src/pages/') &&
          /\.(tsx|jsx)$/.test(f.path),
      );
      const layoutFileList = files.filter(
        (f) =>
          f.path.startsWith('src/layout/') &&
          /\.(tsx|jsx)$/.test(f.path),
      );

      // Map page names → file paths
      const pageMap: Record<string, string> = {};
      for (const f of pageFiles) {
        const fileName = f.path.split('/').pop() || '';
        const name = fileName
          .replace(/Page\.(tsx|jsx)$/, '')
          .toLowerCase();
        if (name) pageMap[name] = f.path;
      }

      // Map layout names → file paths
      const layoutMap: Record<string, string> = {};
      for (const f of layoutFileList) {
        const fileName = f.path.split('/').pop() || '';
        const name = fileName.replace(/\.(tsx|jsx)$/, '').toLowerCase();
        if (name) layoutMap[name] = f.path;
      }

      // 3. Determine which page to show
      const targetPage =
        pageMap[activePage] || pageMap['home'] || pageFiles[0]?.path;
      if (!targetPage) {
        setError('No page files found in the template.');
        setLoading(false);
        return;
      }

      // 4. Fetch all needed files in parallel
      const fetchFile = async (path: string) => {
        const data = await api.get(
          `/developers/templates/${templateId}/git/file?path=${encodeURIComponent(path)}`,
        );
        return (data.content as string) || '';
      };

      const [pageSource, headerSource, footerSource, wrapperSource] =
        await Promise.all([
          fetchFile(targetPage),
          layoutMap['header'] ? fetchFile(layoutMap['header']) : Promise.resolve(''),
          layoutMap['footer'] ? fetchFile(layoutMap['footer']) : Promise.resolve(''),
          layoutMap['wrapper'] ? fetchFile(layoutMap['wrapper']) : Promise.resolve(''),
        ]);

      // 5. Extract component names
      const pageComponentName = findComponentName(pageSource) || 'Page';
      const headerComponentName = headerSource
        ? findComponentName(headerSource)
        : null;
      const footerComponentName = footerSource
        ? findComponentName(footerSource)
        : null;
      const wrapperComponentName = wrapperSource
        ? findComponentName(wrapperSource)
        : null;

      // 6. Build srcdoc
      const html = buildSrcdoc(
        pageSource,
        headerSource,
        footerSource,
        wrapperSource,
        pageComponentName,
        headerComponentName,
        footerComponentName,
        wrapperComponentName,
        locale,
      );

      setSrcdoc(html);
    } catch (err) {
      console.error('Preview build failed:', err);
      setError('Failed to load preview. Make sure the template has a connected GitHub repository.');
    } finally {
      setLoading(false);
    }
  }, [templateId, activePage, locale]);

  useEffect(() => {
    buildPreview();
  }, [buildPreview]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #e2e8f0',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#ffffff',
          color: '#64748b',
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 32,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      title="Template Preview"
    />
  );
}
