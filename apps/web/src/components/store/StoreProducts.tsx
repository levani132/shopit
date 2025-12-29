'use client';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  images?: string[];
  inStock?: boolean;
}

interface StoreProductsProps {
  products: Product[];
}

export function StoreProducts({ products }: StoreProductsProps) {
  if (products.length === 0) {
    return (
      <section id="products" className="py-12 bg-gray-50 dark:bg-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Products
          </h2>
          <div className="text-center py-16">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, var(--store-accent-100) 0%, var(--store-accent-200) 100%)`,
              }}
            >
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: 'var(--store-accent-500)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No products yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for new arrivals!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-12 bg-gray-50 dark:bg-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Products
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const inStock = product.inStock !== false;
  const hasImage = product.images && product.images.length > 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {hasImage ? (
          <img
            src={product.images![0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, var(--store-accent-100) 0%, var(--store-accent-200) 100%)`,
            }}
          >
            <svg
              className="w-16 h-16 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--store-accent-500)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Out of Stock Badge */}
        {!inStock && (
          <div className="absolute top-3 left-3 bg-gray-900/80 text-white text-xs font-medium px-3 py-1 rounded-full">
            Out of Stock
          </div>
        )}

        {/* Quick View Button */}
        <button
          className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          aria-label="Quick view"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      </div>

      {/* Product Info */}
      <div className="p-5">
        {product.category && (
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--store-accent-600)' }}
          >
            {product.category}
          </span>
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1 mb-2 line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            ₾{product.price}
          </span>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              inStock
                ? 'text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            style={
              inStock ? { backgroundColor: 'var(--store-accent-500)' } : undefined
            }
            disabled={!inStock}
          >
            {inStock ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

