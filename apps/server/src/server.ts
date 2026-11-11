import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Attach Socket.io instance to requests
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// System Health Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.status(200).json({
      status: 'success',
      message: 'RMS Engine is fully operational',
      database: 'Connected',
      totalUsers: userCount,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: (error as Error).message,
    });
  }
});

// Boot Server
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`WebSocket Server active on port ${PORT}`);
});