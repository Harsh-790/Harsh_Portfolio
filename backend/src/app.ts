import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { gulluRouter } from './routes/gullu';
import { adminMediaRouter, publicMediaRouter } from './routes/media';

/**
 * Atlas outages surface as Prisma raw-query failures or native Mongo driver
 * errors. Turn those into a clean 503 instead of a generic 500/stack trace.
 */
function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown; message?: unknown };

  if (record.name === 'MongoServerSelectionError' || record.name === 'MongoNetworkError') return true;
  if (record.code === 'P1001' || record.code === 'P1008' || record.code === 'P1017') return true;

  const message = typeof record.message === 'string' ? record.message : '';
  return /Server selection timeout|No available servers|received fatal alert|Can't reach database server/i.test(message);
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Server-to-server requests have no Origin. Browser origins must be listed.
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: false,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Range'],
      exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Disposition'],
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const health = (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  };

  // Render health checks and uptime monitors use /health. The API-prefixed
  // aliases stay for older clients.
  app.get('/health', health);
  app.get('/api/health', health);

  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/gullu', gulluRouter);
  app.use('/api/media', publicMediaRouter);
  app.use('/api/admin/media', adminMediaRouter);
  app.use('/api/admin', adminRouter);

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    res.status(404).type('text/plain').send('Not found');
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'That file is larger than 24 MB.' });
        return;
      }
      res.status(400).json({ error: 'The upload could not be processed.' });
      return;
    }

    if (isDatabaseUnavailable(error)) {
      console.error(
        'API database unavailable:',
        error instanceof Error ? error.message.split('\n')[0] : error,
      );
      if (!res.headersSent) {
        res.set('Retry-After', '15');
        res.status(503).json({ error: 'The database is temporarily unavailable. Please try again shortly.' });
      }
      return;
    }

    console.error('API error:', error);
    if (!res.headersSent) {
      const message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : (error instanceof Error ? error.message : 'Internal server error.');
      res.status(500).json({ error: message });
    }
  });

  return app;
}
