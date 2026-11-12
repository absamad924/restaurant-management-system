import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
// Delete a menu item (MANAGER only)
router.delete('/items/:id', authenticateToken, requireRole([Role.MANAGER]), async (req, res) => {
  const id = req.params.id as string;

  try {
    await prisma.menuItem.delete({
      where: { id },
    });

    // Broadcast to all connected clients that the menu changed
    const io = (req as any).io;
    if (io) {
      io.emit('menu_updated');
    }

    res.status(200).json({ status: 'success', message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all categories with active menu items (Public / POS access)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ status: 'success', categories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all menu items (Price checker endpoint for customer mobile app)
router.get('/items', async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
         include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Create a new menu item (MANAGER only)
router.post('/items', authenticateToken, requireRole([Role.MANAGER]), async (req, res) => {
 const io = (req as any).io;
if (io) {
  io.emit('menu_updated');
}
  const { name, description, price, categoryId, stockCount } = req.body;

  if (!name || !price || !categoryId) {
    return res.status(400).json({ status: 'error', message: 'Name, price, and categoryId are required' });
  }

  try {
    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        categoryId,
        stockCount: stockCount ? parseInt(stockCount) : 0,
      },
    });

    res.status(201).json({ status: 'success', item: newItem });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Update menu item price/availability (MANAGER only)
router.patch('/items/:id', authenticateToken, requireRole([Role.MANAGER]), async (req, res) => {

  const id = req.params.id as string;
  const { price, stockCount, isAvailable } = req.body;

  try {
    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stockCount !== undefined && { stockCount: parseInt(stockCount) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
      },
    });

      const io = (req as any).io;
if (io) {
  io.emit('menu_updated');
}

    res.status(200).json({ status: 'success', item: updatedItem });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

export default router;