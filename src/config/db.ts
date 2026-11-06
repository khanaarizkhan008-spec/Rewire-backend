import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

declare global {
  var prismaClient: PrismaClient | undefined;
}

export const prisma = global.prismaClient || new PrismaClient({
  log: ENV.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (ENV.NODE_ENV !== 'production') {
  global.prismaClient = prisma;
}

