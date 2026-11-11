import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { OrderStatus, OrderFlow, OrderType } from '@prisma/client';

const router = Router();

// Create a new order (Cashier / POS or Customer App)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { items, flow, type } = req.body; 
  // items expected format: [{ menuItemId: "id", quantity: 2, notes: "No onions" }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Order items are required' });
  }

  try {
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const dbItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!dbItem || !dbItem.isAvailable) {
        return res.status(400).json({ 
          status: 'error', 
          message: `Menu item ${item.menuItemId} is unavailable` 
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

    // Generate a random 6-digit order number (e.g., ORD-739104)
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    // Save Order to Database
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        flow: flow || OrderFlow.KITCHEN_ORDER,
        type: type || OrderType.DINE_IN,
        totalAmount,
        status: OrderStatus.PENDING_KITCHEN,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    // Emit real-time WebSocket event for kitchen / cashier display
    const io = (req as any).io;
    if (io) {
      io.emit('new_order', newOrder);
    }

    res.status(201).json({ status: 'success', order: newOrder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all active orders (for Kitchen / Cashier monitors)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING_KITCHEN, OrderStatus.READY],
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ status: 'success', orders: activeOrders });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Update order status (PENDING_KITCHEN -> READY -> COMPLETED / CANCELLED)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!status || !Object.values(OrderStatus).includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Invalid order status' });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    // Notify real-time clients of status change
    const io = (req as any).io;
    if (io) {
      io.emit('order_status_updated', updatedOrder);
    }

    res.status(200).json({ status: 'success', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;