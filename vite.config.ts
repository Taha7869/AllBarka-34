import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    envDir: process.env.ALLBARKA_SKIP_LOCAL_ENV === 'true' ? false : undefined,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      watch: { ignored: [path.resolve('.local-setup').replace(/\\/g, '/') + '/**'] },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
              if (id.includes('motion') || id.includes('framer-motion')) return 'motion';
              if (id.includes('gsap')) return 'gsap';
              if (id.includes('embla-carousel')) return 'vendor-carousel';
              if (id.includes('canvas-confetti')) return 'vendor-confetti';
              if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
              if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            }
            if (id.includes('src/data/products')) return 'catalog-products';
            if (id.includes('src/data/catalogIntake')) return 'catalog-intake';
          },
        },
      },
    },
  };
});