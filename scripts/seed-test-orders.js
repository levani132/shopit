/**
 * Seed test orders for courier functionality testing
 * Run with: node scripts/seed-test-orders.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string from .env
const DATABASE_URL =
  'mongodb+srv://levanicomp_db_user:4tSMyMwFDaoabiFR@shopit.tqq00zv.mongodb.net/?appName=ShopIt';

// Tbilisi locations for testing (realistic addresses across the city)
const TBILISI_LOCATIONS = [
  {
    address: 'Rustaveli Avenue 12',
    city: 'Tbilisi',
    lat: 41.701,
    lng: 44.8015,
  },
  {
    address: 'Chavchavadze Avenue 45',
    city: 'Tbilisi',
    lat: 41.7089,
    lng: 44.773,
  },
  { address: 'Pekini Avenue 20', city: 'Tbilisi', lat: 41.7277, lng: 44.7653 },
  { address: 'Kostava Street 67', city: 'Tbilisi', lat: 41.7165, lng: 44.7847 },
  {
    address: 'Marjanishvili Street 5',
    city: 'Tbilisi',
    lat: 41.7081,
    lng: 44.7964,
  },
  {
    address: 'Agmashenebeli Avenue 100',
    city: 'Tbilisi',
    lat: 41.7043,
    lng: 44.7912,
  },
  {
    address: 'Vazha-Pshavela Avenue 33',
    city: 'Tbilisi',
    lat: 41.7337,
    lng: 44.7587,
  },
  {
    address: 'Tamarashvili Street 8',
    city: 'Tbilisi',
    lat: 41.7195,
    lng: 44.7523,
  },
  {
    address: 'Nutsubidze Street 15',
    city: 'Tbilisi',
    lat: 41.7412,
    lng: 44.7401,
  },
  {
    address: 'Saburtalo Street 28',
    city: 'Tbilisi',
    lat: 41.7298,
    lng: 44.7708,
  },
  { address: 'Kazbegi Avenue 55', city: 'Tbilisi', lat: 41.7215, lng: 44.7593 },
  {
    address: 'Tsereteli Avenue 90',
    city: 'Tbilisi',
    lat: 41.7241,
    lng: 44.7872,
  },
  { address: 'Delisi Street 3', city: 'Tbilisi', lat: 41.7328, lng: 44.7522 },
  { address: 'Digomi Street 22', city: 'Tbilisi', lat: 41.7485, lng: 44.7312 },
  { address: 'Gldani Street 7', city: 'Tbilisi', lat: 41.7623, lng: 44.8101 },
  {
    address: 'Nadzaladevi Street 14',
    city: 'Tbilisi',
    lat: 41.7512,
    lng: 44.8243,
  },
  { address: 'Didube Street 40', city: 'Tbilisi', lat: 41.7287, lng: 44.7956 },
  {
    address: 'Avlabari Street 11',
    city: 'Tbilisi',
    lat: 41.6928,
    lng: 44.8145,
  },
  {
    address: 'Ortachala Street 19',
    city: 'Tbilisi',
    lat: 41.6812,
    lng: 44.8256,
  },
  { address: 'Isani Street 25', city: 'Tbilisi', lat: 41.6978, lng: 44.8312 },
  {
    address: 'Varketili Street 31',
    city: 'Tbilisi',
    lat: 41.6823,
    lng: 44.8567,
  },
  { address: 'Samgori Street 16', city: 'Tbilisi', lat: 41.6912, lng: 44.8423 },
  {
    address: 'Aghmashenebeli Alley 5',
    city: 'Tbilisi',
    lat: 41.7023,
    lng: 44.7867,
  },
  {
    address: 'Vera Park Street 9',
    city: 'Tbilisi',
    lat: 41.7145,
    lng: 44.7789,
  },
  {
    address: 'Mtatsminda Street 4',
    city: 'Tbilisi',
    lat: 41.6967,
    lng: 44.7934,
  },
  {
    address: 'Sololaki Street 12',
    city: 'Tbilisi',
    lat: 41.6923,
    lng: 44.8023,
  },
  { address: 'Betlemi Street 6', city: 'Tbilisi', lat: 41.6889, lng: 44.8089 },
  {
    address: 'Kote Afkhazi Street 15',
    city: 'Tbilisi',
    lat: 41.6912,
    lng: 44.8056,
  },
  {
    address: 'Leselidze Street 22',
    city: 'Tbilisi',
    lat: 41.6934,
    lng: 44.8078,
  },
  { address: 'Shardeni Street 8', city: 'Tbilisi', lat: 41.6901, lng: 44.8112 },
  {
    address: 'Erekovani Street 18',
    city: 'Tbilisi',
    lat: 41.6856,
    lng: 44.8178,
  },
  {
    address: 'Baratashvili Street 24',
    city: 'Tbilisi',
    lat: 41.6978,
    lng: 44.8145,
  },
  { address: 'Pushkin Street 10', city: 'Tbilisi', lat: 41.7034, lng: 44.7989 },
  {
    address: 'Lermontovi Street 7',
    city: 'Tbilisi',
    lat: 41.7056,
    lng: 44.7967,
  },
  {
    address: 'Galaktioni Street 13',
    city: 'Tbilisi',
    lat: 41.7078,
    lng: 44.7923,
  },
  { address: 'Tabidze Street 21', city: 'Tbilisi', lat: 41.7098, lng: 44.7856 },
  { address: 'Barnovi Street 30', city: 'Tbilisi', lat: 41.7123, lng: 44.7812 },
  { address: 'Kipiani Street 17', city: 'Tbilisi', lat: 41.7156, lng: 44.7767 },
  { address: 'Chitadze Street 9', city: 'Tbilisi', lat: 41.7012, lng: 44.8034 },
  { address: 'Atoneli Street 11', city: 'Tbilisi', lat: 41.6989, lng: 44.8067 },
  {
    address: 'Iosebidze Street 5',
    city: 'Tbilisi',
    lat: 41.7189,
    lng: 44.7689,
  },
  {
    address: 'Sulkhan-Saba Avenue 44',
    city: 'Tbilisi',
    lat: 41.7234,
    lng: 44.7623,
  },
  {
    address: 'University Street 2',
    city: 'Tbilisi',
    lat: 41.7078,
    lng: 44.7734,
  },
  {
    address: 'Politkovskaia Street 8',
    city: 'Tbilisi',
    lat: 41.7312,
    lng: 44.7567,
  },
  {
    address: 'Tsinandali Street 15',
    city: 'Tbilisi',
    lat: 41.7267,
    lng: 44.7634,
  },
  {
    address: 'Melikishvili Street 23',
    city: 'Tbilisi',
    lat: 41.7045,
    lng: 44.7812,
  },
  {
    address: 'Beliashvili Street 19',
    city: 'Tbilisi',
    lat: 41.7378,
    lng: 44.7489,
  },
  {
    address: 'Kandelaki Street 27',
    city: 'Tbilisi',
    lat: 41.7412,
    lng: 44.7523,
  },
  {
    address: 'Bochorishvili Street 35',
    city: 'Tbilisi',
    lat: 41.7456,
    lng: 44.7378,
  },
  { address: 'Mindeli Street 42', city: 'Tbilisi', lat: 41.7234, lng: 44.7567 },
];

// Test product names
const PRODUCT_NAMES = [
  { name: 'მაისური', nameEn: 'T-Shirt', price: 35 },
  { name: 'ჯინსი', nameEn: 'Jeans', price: 89 },
  { name: 'სპორტული ფეხსაცმელი', nameEn: 'Sneakers', price: 120 },
  { name: 'ჩანთა', nameEn: 'Bag', price: 65 },
  { name: 'საათი', nameEn: 'Watch', price: 150 },
  { name: 'სათვალე', nameEn: 'Sunglasses', price: 45 },
  { name: 'ქუდი', nameEn: 'Hat', price: 25 },
  { name: 'შარფი', nameEn: 'Scarf', price: 30 },
  { name: 'ჟაკეტი', nameEn: 'Jacket', price: 180 },
  { name: 'პერანგი', nameEn: 'Shirt', price: 55 },
];

const SHIPPING_SIZES = ['small', 'medium', 'large', 'extra_large'];

async function seedOrders() {
  const client = new MongoClient(DATABASE_URL);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // List all databases in cluster
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log(
      'Databases in cluster:',
      dbs.databases
        .map((d) => `${d.name} (${(d.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`)
        .join(', '),
    );

    const db = client.db('test');

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(
      'Collections:',
      collections.map((c) => c.name).join(', ') || 'NONE',
    );

    // Get existing stores (any stores, not just active)
    const stores = await db.collection('stores').find({}).limit(5).toArray();
    if (stores.length === 0) {
      console.log('No stores found. Please create a store first.');
      return;
    }
    console.log(`Found ${stores.length} stores`);
    stores.forEach((s) =>
      console.log(
        `  - ${s.name} (${s.subdomain}) - active: ${s.isActive}, location: ${JSON.stringify(s.location)}`,
      ),
    );

    // Get existing users (for order recipient)
    const users = await db.collection('users').find({}).limit(10).toArray();
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    console.log(`Found ${users.length} users`);

    // Check existing order count
    const existingOrderCount = await db.collection('orders').countDocuments();
    console.log(`Current orders in database: ${existingOrderCount}`);

    // Create test orders
    const ordersToCreate = [];
    const numOrders = 50;

    for (let i = 0; i < numOrders; i++) {
      const store = stores[Math.floor(Math.random() * stores.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const deliveryLocation = TBILISI_LOCATIONS[i % TBILISI_LOCATIONS.length];
      const product =
        PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)];
      const qty = Math.floor(Math.random() * 3) + 1;

      // Weight sizes towards small/medium (80% of orders) so car couriers can deliver
      const rand = Math.random();
      let shippingSize;
      if (rand < 0.5) {
        shippingSize = 'small';
      } else if (rand < 0.8) {
        shippingSize = 'medium';
      } else if (rand < 0.9) {
        shippingSize = 'large';
      } else {
        shippingSize = 'extra_large';
      }

      // Calculate shipping price based on size
      const shippingPrices = {
        small: 5,
        medium: 8,
        large: 12,
        extra_large: 18,
      };
      const shippingPrice = shippingPrices[shippingSize] || 5;

      const itemsPrice = product.price * qty;
      const totalPrice = itemsPrice + shippingPrice;

      const order = {
        user: user._id,
        isGuestOrder: false,
        orderItems: [
          {
            productId: new ObjectId(),
            name: product.name,
            nameEn: product.nameEn,
            image: `https://picsum.photos/seed/${i}/150/150`,
            price: product.price,
            qty: qty,
            storeId: store._id,
            storeName: store.name,
            storeSubdomain: store.subdomain,
            courierType: 'shopit',
            prepTimeMinDays: 0,
            prepTimeMaxDays: 1,
            deliveryMinDays: 1,
            deliveryMaxDays: 2,
            shippingSize: shippingSize,
          },
        ],
        shippingDetails: {
          address: deliveryLocation.address,
          city: deliveryLocation.city,
          country: 'Georgia',
          phoneNumber:
            '+995 5' + Math.floor(10000000 + Math.random() * 90000000),
        },
        pickupStoreName: store.name,
        pickupAddress: store.address || 'Rustaveli Avenue 1',
        pickupCity: store.city || 'Tbilisi',
        pickupPhoneNumber: store.phone || '+995 555 123456',
        pickupLocation: store.location || { lat: 41.7151, lng: 44.8271 },
        deliveryLocation: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        },
        recipientName: user.firstName + ' ' + user.lastName,
        paymentMethod: 'BOG',
        deliveryMethod: 'delivery',
        paymentResult: {
          id: 'test_order_' + Date.now() + '_' + i,
          status: 'completed',
          updateTime: new Date().toISOString(),
        },
        itemsPrice: itemsPrice,
        shippingPrice: shippingPrice,
        totalPrice: totalPrice,
        isPaid: true,
        paidAt: new Date(),
        isDelivered: false,
        status: 'ready_for_delivery', // Ready for courier pickup
        // Order-level shipping size (must match for route filtering)
        shippingSize: shippingSize,
        estimatedShippingSize: shippingSize,
        // Delivery deadline - random time in next 1-3 days
        deliveryDeadline: new Date(
          Date.now() + (24 + Math.random() * 48) * 60 * 60 * 1000,
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      ordersToCreate.push(order);
    }

    // Insert orders
    const result = await db.collection('orders').insertMany(ordersToCreate);
    console.log(`Created ${result.insertedCount} test orders!`);

    // Count orders by status
    const statusCounts = await db
      .collection('orders')
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray();
    console.log('\nOrders by status:');
    statusCounts.forEach((s) => console.log(`  ${s._id}: ${s.count}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

seedOrders();
