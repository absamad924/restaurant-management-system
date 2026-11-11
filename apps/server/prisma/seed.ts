import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing records
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create Default Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const manager = await prisma.user.create({
    data: {
      name: 'System Manager',
      email: 'manager@rms.com',
      passwordHash: hashedPassword,
      role: Role.MANAGER,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Primary Cashier',
      email: 'cashier@rms.com',
      passwordHash: hashedPassword,
      role: Role.CASHIER,
    },
  });

  console.log(`Created Users: ${manager.email} (MANAGER), ${cashier.email} (CASHIER)`);

  // Create Categories & Menu Items
  const mains = await prisma.category.create({
    data: {
      name: 'Main Dishes',
      description: 'Hearty cooked meals and rice dishes',
      menuItems: {
        create: [
          { name: 'Special Jollof Rice & Chicken', price: 3500, stockCount: 50 },
          { name: 'Fried Rice & Grilled Fish', price: 4000, stockCount: 40 },
          { name: 'Pounded Yam & Egusi Soup', price: 3000, stockCount: 30 },
        ],
      },
    },
  });

  const drinks = await prisma.category.create({
    data: {
      name: 'Beverages',
      description: 'Chilled soft drinks and juices',
      menuItems: {
        create: [
          { name: 'Cold Soft Drink 50cl', price: 500, stockCount: 100 },
          { name: 'Fresh Orange Juice', price: 1200, stockCount: 60 },
          { name: 'Bottled Water 75cl', price: 300, stockCount: 150 },
        ],
      },
    },
  });

  console.log(`Created Categories: ${mains.name}, ${drinks.name}`);
  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });