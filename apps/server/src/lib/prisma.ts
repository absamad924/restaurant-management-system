import 'dotenv/config';
import process from 'node:process';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../prisma/contract.d.js';
import contractJson from '../prisma/contract.json' with { type: 'json' };

export const prisma = postgres<Contract>({
  contract: contractFromJson(contractJson),
  url: process.env['DATABASE_URL']!,
});