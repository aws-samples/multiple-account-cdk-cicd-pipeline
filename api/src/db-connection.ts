require('dotenv').config();
require('reflect-metadata');
import { createConnection } from 'typeorm';

export const db = async () => await createConnection();
