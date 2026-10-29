import dotenv from 'dotenv';
dotenv.config();
if (process.env.TEST_DATABASE_URL) {
  const databaseName = new URL(process.env.TEST_DATABASE_URL).pathname;
  if (!databaseName.toLowerCase().includes('test')) throw new Error('TEST_DATABASE_URL must point to a database whose name includes "test".');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
