import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/schema/receipt.ts', './src/schema/driver.ts', './src/schema/delivery.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
