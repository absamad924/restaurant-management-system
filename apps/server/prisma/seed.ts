import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('Seeding database...');

  const managerPassword = await bcrypt.hash('managerSecure123', 10);
  const cashierPassword = await bcrypt.hash('cashierSecure123', 10);
  const kitchenPassword = await bcrypt.hash('kitchenSecure123', 10);

  let manager = await prisma.orm.public.User.where((u) => u.username.eq('manager')).first();
  if (!manager) {
    manager = await prisma.orm.public.User.create({
      username: 'manager',
      password: managerPassword,
      role: 'MANAGER',
    });
  }
  console.log(`Created manager (${manager.username})`);

  let cashier = await prisma.orm.public.User.where((u) => u.username.eq('cashier')).first();
  if (!cashier) {
    cashier = await prisma.orm.public.User.create({
      username: 'cashier',
      password: cashierPassword,
      role: 'CASHIER',
    });
  }
  console.log(`Created cashier (${cashier.username})`);

  let kitchen = await prisma.orm.public.User.where((u) => u.username.eq('kitchen')).first();
  if (!kitchen) {
    kitchen = await prisma.orm.public.User.create({
      username: 'kitchen',
      password: kitchenPassword,
      role: 'KITCHEN',
    });
  }
  console.log(`Created kitchen (${kitchen.username})`);

  let drinksCat = await prisma.orm.public.Category.where((c) => c.name.eq('Drinks')).first();
  if (!drinksCat) {
    drinksCat = await prisma.orm.public.Category.create({ name: 'Drinks' });
  }

  let mealsCat = await prisma.orm.public.Category.where((c) => c.name.eq('Meals')).first();
  if (!mealsCat) {
    mealsCat = await prisma.orm.public.Category.create({ name: 'Meals' });
  }

  console.log('Categories ready');

  const itemsToSeed = [
    { name: 'Bottled Water 75cl', price: 300, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Cold Soft Drink 50cl', price: 500, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Fresh Orange Juice', price: 1200, isAvailable: true, categoryId: drinksCat.id },
    { name: 'Fried Rice & Grilled Fish', price: 4000, isAvailable: true, categoryId: mealsCat.id },
    { name: 'Special Jollof Rice & Chicken', price: 3500, isAvailable: true, categoryId: mealsCat.id },
  ];

  for (const item of itemsToSeed) {
    const existing = await prisma.orm.public.MenuItem.where((m) => m.name.eq(item.name)).first();
    if (!existing) {
      await prisma.orm.public.MenuItem.create(item);
    }
  }

  console.log('Created default menu catalog items');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.close();
  });