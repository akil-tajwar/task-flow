import { Queue, Worker } from 'bullmq';
import { env } from '../lib/env';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
};

export const notificationQueue = new Queue('notifications', { connection });
export const orderQueue = new Queue('orders', { connection });

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    console.log(`[Notification] Processing job ${job.name}:`, job.data);
  },
  { connection }
);

notificationWorker.on('completed', (job) => console.log(`[Notification] Job ${job.id} completed`));
notificationWorker.on('failed', (job, err) => console.error(`[Notification] Job ${job?.id} failed:`, err));
