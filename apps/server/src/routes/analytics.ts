import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const rawOrders = await prisma.orm.public.Order
      .orderBy((o) => o.createdAt.desc())
      .include('items')
      .all();

    const menuItems = await prisma.orm.public.MenuItem.all();
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const allOrders = rawOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        menuItem: menuItemMap.get(item.menuItemId) || null,
      })),
    }));

    const totalOrders = allOrders.length;

    // Calculate total revenue
    const totalRevenue = allOrders.reduce((sum, order) => {
      return sum + Number(order.totalAmount || 0);
    }, 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      status: 'success',
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
      },
      recentOrders: allOrders.slice(0, 3), // Send only the 3 most recent for the table
      history: allOrders,
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load analytics data' });
  }
});

export default router;