require('dotenv').config();
require('reflect-metadata');
import { createConnection } from 'typeorm';

export const db = async () =>
  await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['entities/*.ts'],
    migrations: ['migration/*.js'],
  });
