import { Router } from 'express';
import { answerGullu } from '../services/gullu';

export const gulluRouter = Router();

gulluRouter.post('/', async (req, res, next) => {
  try {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    const ip = forwarded || String(req.headers['x-real-ip'] ?? '') || req.ip || 'local';
    const result = await answerGullu(req.body?.question, ip);

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    next(error);
  }
});
