import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Hash separate passwords for manager and cashier
  const managerPassword = await bcrypt.hash('managerSecure123', 10);
  const cashierPassword = await bcrypt.hash('cashierSecure123', 10);

  // 2. Seed Manager Account
  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      password: managerPassword,
      role: Role.MANAGER,
    },
  });
  console.log(`✅ Created manager (${manager.username})`);

  // 3. Seed Cashier Account
  const cashier = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      password: cashierPassword,
      role: Role.CASHIER,
    },
  });
  console.log(`✅ Created cashier (${cashier.username})`);

  // 4. Seed Categories safely using findFirst/create
  let drinksCat = await prisma.category.findFirst({ where: { name: 'Drinks' } });
  if (!drinksCat) {
    drinksCat = await prisma.category.create({ data: { name: 'Drinks' } });
  }

  let mealsCat = await prisma.category.findFirst({ where: { name: 'Meals' } });
  if (!mealsCat) {
    mealsCat = await prisma.category.create({ data: { name: 'Meals' } });
  }

  console.log('✅ Categories ready');

  // 5. Seed Menu Items
  const itemsToSeed = [
    { name: 'Bottled Water 75cl', price: 300, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Cold Soft Drink 50cl', price: 500, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Fresh Orange Juice', price: 1200, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Fried Rice & Grilled Fish', price: 4000, isAvailable: true, categoryId: mealsCat.id },
    { name: 'Special Jollof Rice & Chicken', price: 3500, isAvailable: true, categoryId: mealsCat.id },
  ];

  for (const item of itemsToSeed) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  console.log('✅ Created default menu catalog items');
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });