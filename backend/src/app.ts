import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { gulluRouter } from './routes/gullu';
import { adminMediaRouter, publicMediaRouter } from './routes/media';

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

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

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

    console.error('API error:', error);
    if (!res.headersSent) {
      const message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : (error instanceof Error ? error.message : 'Internal server error.');
      res.status(500).json({ error: message });
    }
  });

  return app;
}
