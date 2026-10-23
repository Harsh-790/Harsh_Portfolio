import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const port = Number(process.env.PORT) || 5000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Portfolio API listening on http://localhost:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, closing server.`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
