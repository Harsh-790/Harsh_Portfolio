import { Router } from 'express';
import { changePassword, createToken, verifyCredentials } from '../lib/auth';
import { requireAdmin } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      res.status(401).json({ error: 'Those credentials did not match our records.' });
      return;
    }

    res.json({ token: createToken(user.id), user });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/logout', (_req, res) => {
  // Sessions are stateless signed tokens. The frontend removes its HTTP-only cookie.
  res.status(204).end();
});

authRouter.post('/change-password', requireAdmin, async (req, res, next) => {
  try {
    const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const nextPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (nextPassword.length < 8) {
      res.status(400).json({ error: 'Use at least 8 characters for the new password.' });
      return;
    }

    try {
      await changePassword(req.user!.id, current, nextPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your current password is not correct.';
      res.status(400).json({ error: message });
      return;
    }

    res.json({ ok: true, message: 'Password updated.' });
  } catch (error) {
    next(error);
  }
});
