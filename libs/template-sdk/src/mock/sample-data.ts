import type {
  StoreData,
  CategoryData,
  HomepageProduct,
} from '../types/template.types.js';

// ---------------------------------------------------------------------------
// Sample categories
// ---------------------------------------------------------------------------

export const sampleCategories: CategoryData[] = [
  {
    _id: 'cat-1',
    name: 'Electronics',
    nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' },
    slug: 'electronics',
    subcategories: [
      {
        _id: 'sub-1',
        name: 'Phones',
        nameLocalized: { en: 'Phones', ka: 'ტელეფონები' },
        slug: 'phones',
      },
      {
        _id: 'sub-2',
        name: 'Laptops',
        nameLocalized: { en: 'Laptops', ka: 'ლეპტოპები' },
        slug: 'laptops',
      },
    ],
  },
  {
    _id: 'cat-2',
    name: 'Clothing',
    nameLocalized: { en: 'Clothing', ka: 'ტანსაცმელი' },
    slug: 'clothing',
    subcategories: [
      {
        _id: 'sub-3',
        name: "Men's",
        nameLocalized: { en: "Men's", ka: 'კაცის' },
        slug: 'mens',
      },
      {
        _id: 'sub-4',
        name: "Women's",
        nameLocalized: { en: "Women's", ka: 'ქალის' },
        slug: 'womens',
      },
    ],
  },
  {
    _id: 'cat-3',
    name: 'Home & Garden',
    nameLocalized: { en: 'Home & Garden', ka: 'სახლი და ბაღი' },
    slug: 'home-garden',
    subcategories: [],
  },
];

// ---------------------------------------------------------------------------
// Sample store
// ---------------------------------------------------------------------------

export const sampleStore: StoreData = {
  id: 'store-demo-001',
  subdomain: 'demo-store',
  name: 'Demo Store',
  nameLocalized: { en: 'Demo Store', ka: 'დემო მაღაზია' },
  description: 'A sample store for template development',
  descriptionLocalized: {
    en: 'A sample store for template development',
    ka: 'შაბლონის დეველოპმენტის სატესტო მაღაზია',
  },
  aboutUs: 'We are a demo store showcasing the ShopIt template system.',
  aboutUsLocalized: {
    en: 'We are a demo store showcasing the ShopIt template system.',
    ka: 'ჩვენ ვართ დემო მაღაზია, რომელიც ShopIt-ის შაბლონის სისტემას აჩვენებს.',
  },
  brandColor: '#1e40af',
  accentColor: '#3b82f6',
  authorName: 'John Doe',
  authorNameLocalized: { en: 'John Doe', ka: 'ჯონ დოუ' },
  showAuthorName: true,
  phone: '+995 555 123 456',
  email: 'demo@shopit.ge',
  address: 'Tbilisi, Georgia',
  socialLinks: {
    facebook: 'https://facebook.com/demo-store',
    instagram: 'https://instagram.com/demo-store',
  },
  categories: sampleCategories,
  isVerified: true,
  courierType: 'platform',
  selfPickupEnabled: true,
};

// ---------------------------------------------------------------------------
// Sample products
// ---------------------------------------------------------------------------

const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e2e8f0%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22 fill=%22%2394a3b8%22%3EProduct%3C/text%3E%3C/svg%3E';

export const sampleProducts: HomepageProduct[] = [
  {
    _id: 'prod-1',
    name: 'Wireless Headphones',
    nameLocalized: { en: 'Wireless Headphones', ka: 'უსადენო ყურსასმენი' },
    price: 149.99,
    salePrice: 119.99,
    isOnSale: true,
    images: [placeholderImage],
    stock: 25,
    viewCount: 342,
    categoryId: { name: 'Electronics', nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' } },
    description: 'Premium wireless headphones with noise cancellation',
    descriptionLocalized: {
      en: 'Premium wireless headphones with noise cancellation',
      ka: 'პრემიუმ უსადენო ყურსასმენი ხმაურის გაუქმებით',
    },
  },
  {
    _id: 'prod-2',
    name: 'Cotton T-Shirt',
    nameLocalized: { en: 'Cotton T-Shirt', ka: 'ბამბის მაისური' },
    price: 29.99,
    isOnSale: false,
    images: [placeholderImage],
    stock: 100,
    hasVariants: true,
    variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }, { size: 'XL' }],
    viewCount: 156,
    categoryId: { name: 'Clothing', nameLocalized: { en: 'Clothing', ka: 'ტანსაცმელი' } },
  },
  {
    _id: 'prod-3',
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
    _id: 'prod-4',
    name: 'Ceramic Vase',
    nameLocalized: { en: 'Ceramic Vase', ka: 'კერამიკული ვაზა' },
    price: 45.0,
    isOnSale: false,
    images: [placeholderImage],
    stock: 40,
    viewCount: 89,
    categoryId: { name: 'Home & Garden', nameLocalized: { en: 'Home & Garden', ka: 'სახლი და ბაღი' } },
  },
  {
    _id: 'prod-5',
    name: 'Leather Jacket',
    nameLocalized: { en: 'Leather Jacket', ka: 'ტყავის ქურთუკი' },
    price: 199.99,
    isOnSale: false,
    images: [placeholderImage],
    stock: 8,
    viewCount: 278,
    categoryId: { name: 'Clothing', nameLocalized: { en: 'Clothing', ka: 'ტანსაცმელი' } },
  },
  {
    _id: 'prod-6',
    name: 'Bluetooth Speaker',
    nameLocalized: { en: 'Bluetooth Speaker', ka: 'ბლუთუზ დინამიკი' },
    price: 79.99,
    salePrice: 59.99,
    isOnSale: true,
    images: [placeholderImage],
    stock: 50,
    viewCount: 412,
    categoryId: { name: 'Electronics', nameLocalized: { en: 'Electronics', ka: 'ელექტრონიკა' } },
  },
];
