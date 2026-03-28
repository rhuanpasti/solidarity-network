import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  seed: 'tsx prisma/seed.ts',
});
