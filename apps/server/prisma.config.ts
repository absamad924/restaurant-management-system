import 'dotenv/config';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig, prisma7Schema } from '@prisma/orm-postgres/config';

declare const process: { env: Record<string, string | undefined> };

export default definePrismaConfig({
  orm: defineConfig({
    contract: prisma7Schema('./prisma/schema.prisma'),
    output: './src/prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});