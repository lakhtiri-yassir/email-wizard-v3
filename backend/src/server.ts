import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { startEmailWorker } from './queues/processors/emailProcessor';
import redis from './config/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  const redisStatus = redis.status === 'ready' ? 'healthy' : 'unhealthy';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
    uptime: process.uptime(),
  });
});

// Campaign routes
import campaignRoutes from './routes/campaigns';
app.use('/api/campaigns', campaignRoutes);

// Start BullMQ worker
const worker = startEmailWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await worker.close();
  await redis.quit();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Redis: ${redis.status}`);
  console.log(`🔄 BullMQ worker: active`);
});

export default app;
