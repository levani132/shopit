// Mock store data - will be replaced with database queries later

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  inStock: boolean;
}

export interface StoreData {
  subdomain: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  accentColor: string;
  owner: {
    name: string;
    avatar?: string;
  };
  categories: string[];
  products: Product[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Mock stores database
export const MOCK_STORES: Record<string, StoreData> = {
  sample: {
    subdomain: 'sample',
    name: 'Sample Boutique',
    description:
      'Discover unique handcrafted items and artisan products. Quality meets creativity in every piece.',
    accentColor: 'rose',
    owner: {
      name: 'Nino Kapanadze',
    },
    categories: ['Jewelry', 'Accessories', 'Home Decor', 'Gifts'],
    products: [
      {
        id: '1',
        name: 'Handmade Silver Necklace',
        description: 'Beautiful handcrafted silver necklace with Georgian motifs',
        price: 89,
        currency: 'GEL',
        image: '/images/products/placeholder-1.jpg',
        category: 'Jewelry',
        inStock: true,
      },
      {
        id: '2',
        name: 'Ceramic Vase',
        description: 'Hand-painted ceramic vase with traditional patterns',
        price: 120,
        currency: 'GEL',
        image: '/images/products/placeholder-2.jpg',
        category: 'Home Decor',
        inStock: true,
      },
      {
        id: '3',
        name: 'Leather Wallet',
        description: 'Premium leather wallet with embossed design',
        price: 65,
        currency: 'GEL',
        image: '/images/products/placeholder-3.jpg',
        category: 'Accessories',
        inStock: true,
      },
      {
        id: '4',
        name: 'Artisan Earrings',
        description: 'Delicate gold-plated earrings with gemstones',
        price: 45,
        currency: 'GEL',
        image: '/images/products/placeholder-4.jpg',
        category: 'Jewelry',
        inStock: false,
      },
      {
        id: '5',
        name: 'Woven Basket Set',
        description: 'Set of 3 handwoven storage baskets',
        price: 85,
        currency: 'GEL',
        image: '/images/products/placeholder-5.jpg',
        category: 'Home Decor',
        inStock: true,
      },
      {
        id: '6',
        name: 'Gift Box Collection',
        description: 'Curated gift box with assorted artisan items',
        price: 150,
        currency: 'GEL',
        image: '/images/products/placeholder-6.jpg',
        category: 'Gifts',
        inStock: true,
      },
    ],
    socialLinks: {
      instagram: 'https://instagram.com/sampleboutique',
      facebook: 'https://facebook.com/sampleboutique',
    },
  },
  techstore: {
    subdomain: 'techstore',
    name: 'TechStore Georgia',
    description:
      'Your one-stop shop for the latest gadgets and electronics. Quality tech at great prices.',
    accentColor: 'blue',
    owner: {
      name: 'Giorgi Beridze',
    },
    categories: ['Phones', 'Laptops', 'Accessories', 'Audio'],
    products: [
      {
        id: '1',
        name: 'Wireless Earbuds Pro',
        description: 'Premium wireless earbuds with noise cancellation',
        price: 299,
        currency: 'GEL',
        image: '/images/products/placeholder-1.jpg',
        category: 'Audio',
        inStock: true,
      },
      {
        id: '2',
        name: 'Phone Case Bundle',
        description: 'Set of 3 protective cases for various phone models',
        price: 45,
        currency: 'GEL',
        image: '/images/products/placeholder-2.jpg',
        category: 'Accessories',
        inStock: true,
      },
      {
        id: '3',
        name: 'USB-C Hub',
        description: '7-in-1 USB-C hub for laptops',
        price: 89,
        currency: 'GEL',
        image: '/images/products/placeholder-3.jpg',
        category: 'Accessories',
        inStock: true,
      },
    ],
    socialLinks: {
      instagram: 'https://instagram.com/techstorege',
    },
  },
  ana: {
    subdomain: 'ana',
    name: 'Ana\'s Minimalist',
    description:
      'Curated minimalist fashion and lifestyle essentials. Less is more - timeless pieces for the modern individual.',
    accentColor: 'black',
    owner: {
      name: 'Ana Lomidze',
    },
    categories: ['Clothing', 'Bags', 'Accessories', 'Lifestyle'],
    products: [
      {
        id: '1',
        name: 'Classic Black Tote',
        description: 'Premium leather tote bag with minimalist design',
        price: 189,
        currency: 'GEL',
        image: '/images/products/placeholder-1.jpg',
        category: 'Bags',
        inStock: true,
      },
      {
        id: '2',
        name: 'Linen Shirt',
        description: 'Breathable linen shirt in neutral tones',
        price: 95,
        currency: 'GEL',
        image: '/images/products/placeholder-2.jpg',
        category: 'Clothing',
        inStock: true,
      },
      {
        id: '3',
        name: 'Ceramic Watch',
        description: 'Sleek ceramic watch with leather strap',
        price: 320,
        currency: 'GEL',
        image: '/images/products/placeholder-3.jpg',
        category: 'Accessories',
        inStock: true,
      },
      {
        id: '4',
        name: 'Wool Scarf',
        description: 'Soft merino wool scarf in charcoal',
        price: 75,
        currency: 'GEL',
        image: '/images/products/placeholder-4.jpg',
        category: 'Accessories',
        inStock: true,
      },
    ],
    socialLinks: {
      instagram: 'https://instagram.com/anasminimalist',
    },
  },
  ani: {
    subdomain: 'ani',
    name: 'Ani\'s Garden',
    description:
      'Fresh plants, succulents, and botanical home decor. Bring nature into your living space.',
    accentColor: 'green',
    owner: {
      name: 'Ani Javakhishvili',
    },
    categories: ['Plants', 'Pots', 'Decor', 'Care'],
    products: [
      {
        id: '1',
        name: 'Monstera Deliciosa',
        description: 'Beautiful Swiss cheese plant, 40cm tall',
        price: 65,
        currency: 'GEL',
        image: '/images/products/placeholder-1.jpg',
        category: 'Plants',
        inStock: true,
      },
      {
        id: '2',
        name: 'Succulent Collection',
        description: 'Set of 5 assorted succulents in mini pots',
        price: 45,
        currency: 'GEL',
        image: '/images/products/placeholder-2.jpg',
        category: 'Plants',
        inStock: true,
      },
      {
        id: '3',
        name: 'Terracotta Pot Set',
        description: 'Handmade terracotta pots in 3 sizes',
        price: 55,
        currency: 'GEL',
        image: '/images/products/placeholder-3.jpg',
        category: 'Pots',
        inStock: true,
      },
      {
        id: '4',
        name: 'Plant Care Kit',
        description: 'Essential tools and nutrients for plant care',
        price: 38,
        currency: 'GEL',
        image: '/images/products/placeholder-4.jpg',
        category: 'Care',
        inStock: false,
      },
      {
        id: '5',
        name: 'Macrame Plant Hanger',
        description: 'Handwoven cotton macrame hanger',
        price: 28,
        currency: 'GEL',
        image: '/images/products/placeholder-5.jpg',
        category: 'Decor',
        inStock: true,
      },
    ],
    socialLinks: {
      instagram: 'https://instagram.com/anisgarden',
      facebook: 'https://facebook.com/anisgarden',
    },
  },
};

/**
 * Get store data by subdomain
 */
export function getStoreBySubdomain(subdomain: string): StoreData | null {
  return MOCK_STORES[subdomain.toLowerCase()] || null;
}

/**
 * Check if a subdomain is available (not taken)
 */
export function isSubdomainAvailable(subdomain: string): boolean {
  return !MOCK_STORES[subdomain.toLowerCase()];
}

