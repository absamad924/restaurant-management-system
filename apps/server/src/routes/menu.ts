import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Delete a menu item (MANAGER only)
router.delete('/items/:id', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
  const id = req.params.id as string;

  try {
    await prisma.orm.public.MenuItem.where((m) => m.id.eq(id)).delete();

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
    const rawCategories = await prisma.orm.public.Category
      .orderBy((c) => c.name.asc())
      .include('menuItems')
      .all();

    const categories = rawCategories.map((cat) => ({
      ...cat,
      menuItems: [...cat.menuItems].sort((a, b) => a.name.localeCompare(b.name)),
    }));

    res.status(200).json({ status: 'success', categories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Get all menu items (Price checker endpoint for customer mobile app)
router.get('/items', async (req, res) => {
  try {
    const rawItems = await prisma.orm.public.MenuItem
      .orderBy((m) => m.name.asc())
      .include('category')
      .all();

    const items = rawItems.map((item) => ({
      ...item,
      category: item.category ? { name: item.category.name } : null,
    }));

    res.status(200).json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Create a new menu item (MANAGER only)
router.post('/items', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
  const { name, description, price, categoryId, stockCount } = req.body;

  if (!name || !price || !categoryId) {
    return res.status(400).json({ status: 'error', message: 'Name, price, and categoryId are required' });
  }

  try {
    const newItem = await prisma.orm.public.MenuItem.create({
      name,
      description,
      price: parseFloat(price),
      categoryId,
      stockCount: stockCount ? parseInt(stockCount) : 0,
    });

    const io = (req as any).io;
    if (io) {
      io.emit('menu_updated');
    }

    res.status(201).json({ status: 'success', item: newItem });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// Update menu item price/availability (MANAGER only)
router.patch('/items/:id', authenticateToken, requireRole(['MANAGER']), async (req, res) => {
  const id = req.params.id as string;
  const { price, stockCount, isAvailable } = req.body;

  try {
    const updatedItem = await prisma.orm.public.MenuItem
      .where((m) => m.id.eq(id))
      .update({
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stockCount !== undefined && { stockCount: parseInt(stockCount) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
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