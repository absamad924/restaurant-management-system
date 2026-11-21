import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

const VALID_ORDER_STATUSES = ['PENDING_KITCHEN', 'READY', 'COMPLETED', 'CANCELLED'] as const;
type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

// Helper to attach items + menuItem details in the exact shape the frontend expects
async function hydrateOrder(orderId: string) {
  const order = await prisma.orm.public.Order
    .where((o) => o.id.eq(orderId))
    .include('items')
    .first();

  if (!order) return null;

  const menuItems = await prisma.orm.public.MenuItem.all();
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      menuItem: menuItemMap.get(item.menuItemId) || null,
    })),
  };
}

// Create a new order (Cashier / POS or Customer App)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { items, orderType, type, paymentMethod, paymentStatus } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Order items are required' });
  }

  try {
    let totalAmount = 0;
    const orderItemsData: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
    }> = [];

    for (const item of items) {
      const dbItem = await prisma.orm.public.MenuItem
        .where((m) => m.id.eq(item.menuItemId))
        .first();

      if (!dbItem || !dbItem.isAvailable) {
        return res.status(400).json({
          status: 'error',
          message: `Menu item ${item.menuItemId} is unavailable`,
        });
      }

      const itemTotal = dbItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        menuItemId: dbItem.id,
        quantity: item.quantity,
        unitPrice: dbItem.price,
        notes: item.notes || null,
      });
    }

    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    // Direct Sales are instantly fulfilled; Kitchen Orders go to the KDS queue
    const initialStatus: OrderStatus =
      orderType === 'DIRECT_SALE' ? 'COMPLETED' : 'PENDING_KITCHEN';

    const createdOrder = await prisma.orm.public.Order.create({
      orderNumber,
      flow: orderType || 'KITCHEN_ORDER',
      type: type || 'DINE_IN',
      totalAmount,
      status: initialStatus,
      paymentMethod: paymentMethod || null,
      paymentStatus: paymentStatus || 'UNPAID',
    });

    for (const itemData of orderItemsData) {
      await prisma.orm.public.OrderItem.create({
        orderId: createdOrder.id,
        ...itemData,
      });
    }

    const newOrder = await hydrateOrder(createdOrder.id);

    const io = (req as any).io;
    if (io && newOrder) {
      io.emit('new_order', newOrder);
    }

    res.status(201).json({ status: 'success', order: newOrder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all active kitchen orders (for Kitchen Display monitor)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const rawOrders = await prisma.orm.public.Order
      .where((o) => o.status.eq('PENDING_KITCHEN'))
      .orderBy((o) => o.createdAt.asc())
      .include('items')
      .all();

    const menuItems = await prisma.orm.public.MenuItem.all();
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const activeOrders = rawOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        menuItem: menuItemMap.get(item.menuItemId) || null,
      })),
    }));

    res.status(200).json({ status: 'success', orders: activeOrders });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all unpaid orders (for Cashier POS Open Tabs drawer)
router.get('/unpaid', authenticateToken, async (req, res) => {
  try {
    const rawOrders = await prisma.orm.public.Order
      .where((o) => o.paymentStatus.eq('UNPAID'))
      .orderBy((o) => o.createdAt.desc())
      .include('items')
      .all();

    const menuItems = await prisma.orm.public.MenuItem.all();
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const unpaidOrders = rawOrders
      .filter((order) => order.status !== 'CANCELLED')
      .map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          menuItem: menuItemMap.get(item.menuItemId) || null,
        })),
      }));

    res.status(200).json({ status: 'success', orders: unpaidOrders });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Update order status (PENDING_KITCHEN -> READY -> COMPLETED / CANCELLED)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!status || !VALID_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Invalid order status' });
  }

  try {
    await prisma.orm.public.Order
      .where((o) => o.id.eq(id))
      .update({ status });

    const updatedOrder = await hydrateOrder(id);

    const io = (req as any).io;
    if (io && updatedOrder) {
      io.emit('order_status_updated', updatedOrder);
    }

    res.status(200).json({ status: 'success', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Settle payment for an open Kitchen Order (CASHIER / MANAGER)
router.patch('/:id/settle', authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  const { paymentMethod } = req.body;

  if (!paymentMethod || !['CASH', 'CARD', 'TRANSFER'].includes(paymentMethod)) {
    return res.status(400).json({ status: 'error', message: 'Valid payment method is required' });
  }

  try {
    await prisma.orm.public.Order
      .where((o) => o.id.eq(id))
      .update({
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentMethod,
      });

    const settledOrder = await hydrateOrder(id);

    const io = (req as any).io;
    if (io && settledOrder) {
      io.emit('order_status_updated', settledOrder);
    }

    res.status(200).json({ status: 'success', order: settledOrder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;