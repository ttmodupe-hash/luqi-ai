import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
// Keep the main application's single-entry graph and emitted bytes intact.
// This independent build adds only the checkout document and its own assets.
export default defineConfig({
  publicDir: false,
  plugins: [react()],
  build: {
    modulePreload: false,
    outDir: path.resolve(root, 'dist/public'), emptyOutDir: false,
    assetsDir: 'checkout-assets',
    rollupOptions: { input: path.resolve(root, 'paystack-checkout.html') },
  },
});
