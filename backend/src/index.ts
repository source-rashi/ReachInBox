import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailRoutes from './routes/email.routes';
import uploadRoutes from './routes/upload.routes';
import { startWorker } from './queue/worker';
import { reconcileOnBoot } from './services/reconciler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', emailRoutes);
app.use('/api', uploadRoutes);

app.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);
  startWorker();
  await reconcileOnBoot();
});

export default app;
