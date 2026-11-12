import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Note: Assuming your order model is named 'Order' and has a 'total' and 'createdAt' field.
    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            menuItem: true // Pulls in the actual name and details of the item
          }
        }
      }
    });

    const totalOrders = allOrders.length;
    
    // Calculate total revenue
    const totalRevenue = allOrders.reduce((sum, order) => {
      // Ensure we are working with numbers (in case Prisma returns Decimals)
      return sum + Number(order.totalAmount || 0); 
    }, 0);
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      status: 'success',
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue
      },
      recentOrders: allOrders.slice(0, 3), // Send only the 3 most recent for the table
      history: allOrders
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load analytics data' });
  }
});

export default router;