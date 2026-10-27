import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb({
  host: 'mysql',
  port: 3306,
  user: 'studysync',
  password: 'studysync',
  database: 'studysync',
  allowPublicKeyRetrieval: true, 
});

export const prisma = new PrismaClient({ adapter });