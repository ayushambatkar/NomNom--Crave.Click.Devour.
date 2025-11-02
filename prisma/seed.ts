/*
  Seed script: creates sample restaurants (with addresses + coords within 0–10km),
  menu items, and users (some with addresses) for local testing.
*/
import { Prisma, PrismaClient } from '@prisma/client';
import { AddressDto } from 'src/common/dto/address.dto';

const prisma = new PrismaClient();

// Default center: Bengaluru. Override with env SEED_CENTER_LAT/LNG.
const CENTER_LAT = parseFloat(process.env.SEED_CENTER_LAT || '12.9716');
const CENTER_LNG = parseFloat(process.env.SEED_CENTER_LNG || '77.5946');
const MAX_RADIUS_KM = parseFloat(process.env.SEED_MAX_RADIUS_KM || '10');

// Helpers
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2) {
  const n = Math.random() * (max - min) + min;
  return parseFloat(n.toFixed(decimals));
}

// Uniform random point within a circle (radiusKm) around a center lat/lng
function randomPointWithinKm(centerLatDeg: number, centerLngDeg: number, radiusKm: number) {
  // Sample uniformly in a disk: r = R * sqrt(u), theta = 2πv
  const randomRadiusUnit = Math.random();
  const randomAngleUnit = Math.random();

  const distanceFromCenterKm = radiusKm * Math.sqrt(randomRadiusUnit);
  const angleRad = 2 * Math.PI * randomAngleUnit;

  // Local tangent-plane offsets in kilometers
  const offsetEastKm = distanceFromCenterKm * Math.cos(angleRad);
  const offsetNorthKm = distanceFromCenterKm * Math.sin(angleRad);

  // Convert km offsets to degrees
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((centerLatDeg * Math.PI) / 180);

  const newLatDeg = centerLatDeg + offsetNorthKm / kmPerDegLat;
  const newLngDeg = centerLngDeg + offsetEastKm / kmPerDegLng;

  return {
    latitude: parseFloat(newLatDeg.toFixed(6)),
    longitude: parseFloat(newLngDeg.toFixed(6)),
  };
}

const RESTAURANT_NAMES = [
  'Shimla Restaurant',
  'Spice Route',
  'Curry Leaf',
  'Urban Tadka',
  'Royal Biriyani',
  'Tandoor Tales',
  'Masala Magic',
  'Coastal Catch',
  'Bombay Bistro',
  'Punjabi Dhaba',
  'Veggie Delight',
  'Saffron Spoon',
  'Naan & Beyond',
  'Street Eats',
  'Mysore Morsels',
  'Ghar Ka Khana',
  'Dosa Corner',
  'Kebab Kitchen',
  'Tea & Treats',
  'Quick Bites'
];

const MENU_ITEMS = [
  { name: 'Veg Thali', min: 120, max: 220 },
  { name: 'Chicken Biryani', min: 180, max: 320 },
  { name: 'Paneer Butter Masala', min: 160, max: 260 },
  { name: 'Masala Dosa', min: 80, max: 140 },
  { name: 'Tandoori Roti (2pc)', min: 40, max: 80 },
  { name: 'Fish Fry', min: 220, max: 380 },
];

async function createRestaurants(count = 18) {
  const selected = RESTAURANT_NAMES.slice(0, count);
  const created: any[] = [];
  for (const name of selected) {
    const { latitude, longitude } = randomPointWithinKm(CENTER_LAT, CENTER_LNG, Math.random() * MAX_RADIUS_KM);
    const handlingFee = randomFloat(10, 35, 2);
    const packagingCharges = randomFloat(5, 20, 2);
    const opening = `${randomInt(8, 11)}:${randomInt(0, 59).toString().padStart(2, '0')}`;
    const closing = `${randomInt(20, 23)}:${randomInt(0, 59).toString().padStart(2, '0')}`;

    const p= prisma;
    const restaurant = await p.restaurant.create({
      data: {
        name,
        openingTime: opening,
        closingTime: closing,
        handlingFee,
        packagingCharges,
        address: {
          create: {
            line1: `${randomInt(1, 200)} Main Street`,
            city: 'Bengaluru',
            landmark: 'Near Park',
            latitude,
            longitude, 
          },
        },
      },
      include: { address: true },
    });

    // Add 3-5 menu items
    const itemsToCreate = randomInt(3, 5);
    for (let i = 0; i < itemsToCreate; i++) {
      const tpl = MENU_ITEMS[randomInt(0, MENU_ITEMS.length - 1)];
      await p.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          name: tpl.name,
          price: randomFloat(tpl.min, tpl.max, 2),
          isAvailable: Math.random() > 0.1,
          description: 'Tasty and freshly prepared',
        },
      });
    }

    created.push(restaurant);
  }
  return created;
}

async function createUsers(count = 12) {
  const created: any[] = [];
  for (let i = 0; i < count; i++) {
    const withAddress = Math.random() > 0.2; // 80% users have address
    const addr = withAddress ? randomPointWithinKm(CENTER_LAT, CENTER_LNG, Math.random() * MAX_RADIUS_KM) : null;
    const p2= prisma;
    const user = await p2.user.create({
      data: {
        phoneNumber: `+918776${(100000 + i).toString()}`,
        name: `User ${i + 1}`,
        isGuest: false,
        ...(withAddress && {
          address: {
            create: {
              line1: `${randomInt(1, 300)} Cross Road`,
              city: 'Bengaluru',
              landmark: 'Near Market',
              latitude: addr!.latitude,
              longitude: addr!.longitude,
            },
          },
        }),
      },
      include: { address: true },
    });
    created.push(user);
  }
  return created;
}

async function main() {
  console.log('Seeding data...');
  // Optional: clear existing (comment out in shared envs)
  const p= prisma;
  await p.cartItem.deleteMany();
  await p.cart.deleteMany();
  await p.menuItem.deleteMany();
  await p.restaurant.deleteMany();
  await p.user.deleteMany();
  await p.address.deleteMany();

  const restaurants = await createRestaurants(18);
  const users = await createUsers(15);
  console.log(`Seeded ${restaurants.length} restaurants and ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
