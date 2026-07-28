import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import emailRoutes from './routes/email.routes';
import uploadRoutes from './routes/upload.routes';
import { startWorker } from './queue/worker';
import { reconcileOnBoot } from './services/reconciler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedFrontend = process.env.FRONTEND_URL?.replace(/\/$/, '');
const allowedOrigins = allowedFrontend ? [allowedFrontend, 'http://localhost:3000'] : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', emailRoutes);
app.use('/api', uploadRoutes);

// Handle multer and other errors so they return 400 not 500
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error('unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);
  startWorker();
  await reconcileOnBoot();
});

export default app;
